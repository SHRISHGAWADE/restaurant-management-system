const express = require("express");
const pool = require("../db");

const paymentsRouter = express.Router();
const orderPaymentRouter = express.Router();
const billingRouter = express.Router();
const BIGINT_MAX = "9223372036854775807";
const PAYMENT_STATUSES = new Set(["pending", "paid", "failed", "refunded"]);
const PAYMENT_METHODS = new Set(["cash", "card", "UPI", "other"]);
const MAX_MONEY_CENTS = 9999999999n; // NUMERIC(10,2)

function validId(id) {
  return typeof id === "string" && /^[1-9]\d*$/.test(id) &&
    (id.length < BIGINT_MAX.length || (id.length === BIGINT_MAX.length && id <= BIGINT_MAX));
}

function isObjectBody(body) {
  return body && typeof body === "object" && !Array.isArray(body);
}

function parseMoneyCents(value, fieldName) {
  if (typeof value !== "number" && typeof value !== "string") {
    return { error: `${fieldName} must be a non-negative amount with at most two decimal places` };
  }
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    return { error: `${fieldName} must be a non-negative amount with at most two decimal places` };
  }
  const [whole, fractional = ""] = text.split(".");
  const cents = BigInt(whole) * 100n + BigInt((fractional + "00").slice(0, 2));
  if (cents > MAX_MONEY_CENTS) return { error: `${fieldName} exceeds the maximum supported amount` };
  return { cents, decimal: `${whole}.${(fractional + "00").slice(0, 2)}` };
}

function databaseAmountToCents(amount) {
  const text = String(amount);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fractional = ""] = text.split(".");
  return BigInt(whole) * 100n + BigInt((fractional + "00").slice(0, 2));
}

function centsToDecimal(cents) {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

function rollbackAndRespond(client, res, status, message) {
  return client.query("ROLLBACK").then(() => res.status(status).json({ message }));
}

function handlePaymentConstraintError(error, res) {
  if (error.code === "23505") {
    res.status(409).json({ message: "A payment already exists for this order" });
    return true;
  }
  if (error.code === "23503") {
    res.status(409).json({ message: "The referenced order no longer exists" });
    return true;
  }
  if (error.code === "23514" || error.code === "22003") {
    res.status(400).json({ message: "Payment values violate a database constraint" });
    return true;
  }
  return false;
}

const PAYMENT_LIST_SELECT = `
  SELECT p.payment_id, p.order_id, c.customer_name,
         p.discount_amount, p.total_amount AS amount,
         p.payment_method, p.payment_status, p.paid_at
  FROM payments p
  JOIN orders o ON o.order_id = p.order_id
  JOIN customers c ON c.customer_id = o.customer_id`;

paymentsRouter.get("/", async (req, res) => {
  try {
    const result = await pool.query(`${PAYMENT_LIST_SELECT} ORDER BY p.payment_id`);
    return res.json(result.rows);
  } catch (error) {
    console.error("Could not retrieve payments:", error.message);
    return res.status(500).json({ message: "Failed to retrieve payments" });
  }
});

paymentsRouter.get("/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Payment ID must be a positive integer" });
  try {
    const result = await pool.query(`${PAYMENT_LIST_SELECT} WHERE p.payment_id = $1`, [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Payment not found" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Could not retrieve payment:", error.message);
    return res.status(500).json({ message: "Failed to retrieve payment" });
  }
});

orderPaymentRouter.post("/orders/:id/payment", async (req, res) => {
  const orderId = req.params.id;
  if (!validId(orderId)) return res.status(400).json({ message: "Order ID must be a positive integer" });
  if (!isObjectBody(req.body)) return res.status(400).json({ message: "A payment object is required" });

  const discountInput = req.body.discount_amount === undefined ? 0 : req.body.discount_amount;
  const discount = parseMoneyCents(discountInput, "discount_amount");
  if (discount.error) return res.status(400).json({ message: discount.error });
  const method = req.body.payment_method === undefined || req.body.payment_method === null || req.body.payment_method === ""
    ? null
    : req.body.payment_method;
  if (method !== null && (typeof method !== "string" || !PAYMENT_METHODS.has(method))) {
    return res.status(400).json({ message: "payment_method must be cash, card, UPI, or other" });
  }
  const status = req.body.payment_status === undefined ? "pending" : req.body.payment_status;
  if (typeof status !== "string" || !PAYMENT_STATUSES.has(status)) {
    return res.status(400).json({ message: "payment_status must be pending, paid, failed, or refunded" });
  }

  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const orderResult = await client.query(
      "SELECT order_id, status FROM orders WHERE order_id = $1 FOR UPDATE",
      [orderId]
    );
    if (orderResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(404).json({ message: "Order not found" });
    }
    if (orderResult.rows[0].status === "cancelled") {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(409).json({ message: "Cannot create a payment for a cancelled order" });
    }

    const existingPayment = await client.query("SELECT payment_id FROM payments WHERE order_id = $1", [orderId]);
    if (existingPayment.rowCount > 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(409).json({ message: "A payment already exists for this order" });
    }

    const subtotalResult = await client.query(
      `SELECT COUNT(*) AS item_count, COALESCE(SUM(quantity * unit_price), 0) AS subtotal
       FROM order_items WHERE order_id = $1`,
      [orderId]
    );
    if (Number(subtotalResult.rows[0].item_count) === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(409).json({ message: "Cannot create a payment for an order without items" });
    }
    const subtotalCents = databaseAmountToCents(subtotalResult.rows[0].subtotal);
    if (subtotalCents === null) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(500).json({ message: "Stored order subtotal is invalid" });
    }
    if (discount.cents > subtotalCents) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(400).json({ message: "discount_amount cannot exceed the order subtotal" });
    }
    const totalCents = subtotalCents - discount.cents;
    if (totalCents > MAX_MONEY_CENTS) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(400).json({ message: "Final amount exceeds the maximum supported payment amount" });
    }

    const inserted = await client.query(
      `INSERT INTO payments (order_id, discount_amount, total_amount, payment_status, payment_method, paid_at)
       VALUES ($1, $2, $3, $4, $5, CASE WHEN $4 = 'paid' THEN CURRENT_TIMESTAMP ELSE NULL END)
       RETURNING payment_id, order_id, discount_amount, total_amount, payment_status, payment_method, paid_at`,
      [orderId, discount.decimal, centsToDecimal(totalCents), status, method]
    );
    await client.query("COMMIT");
    transactionStarted = false;
    return res.status(201).json({
      message: "Payment recorded successfully",
      payment: inserted.rows[0],
      subtotal: centsToDecimal(subtotalCents)
    });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Could not roll back payment transaction:", rollbackError.message);
      }
    }
    if (handlePaymentConstraintError(error, res)) return;
    console.error("Could not create payment:", error.message);
    return res.status(500).json({ message: "Failed to create payment" });
  } finally {
    if (client) client.release();
  }
});

paymentsRouter.put("/:id/status", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Payment ID must be a positive integer" });
  if (!isObjectBody(req.body) || typeof req.body.payment_status !== "string" || !PAYMENT_STATUSES.has(req.body.payment_status)) {
    return res.status(400).json({ message: "payment_status must be pending, paid, failed, or refunded" });
  }
  try {
    const result = await pool.query(
      `UPDATE payments
       SET payment_status = $1,
           paid_at = CASE WHEN $1 = 'paid' THEN COALESCE(paid_at, CURRENT_TIMESTAMP) ELSE paid_at END
       WHERE payment_id = $2
       RETURNING payment_id, order_id, discount_amount, total_amount, payment_method, payment_status, paid_at`,
      [req.body.payment_status, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Payment not found" });
    return res.json({ message: "Payment status updated successfully", payment: result.rows[0] });
  } catch (error) {
    if (handlePaymentConstraintError(error, res)) return;
    console.error("Could not update payment status:", error.message);
    return res.status(500).json({ message: "Failed to update payment status" });
  }
});

billingRouter.get("/orders/:id", async (req, res) => {
  const orderId = req.params.id;
  if (!validId(orderId)) return res.status(400).json({ message: "Order ID must be a positive integer" });
  try {
    const result = await pool.query(
      `SELECT o.order_id, o.status AS order_status,
              COUNT(oi.item_no) AS item_count,
              COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS subtotal,
              COALESCE(p.discount_amount, 0) AS discount_amount,
              p.payment_id, p.payment_status, p.payment_method, p.paid_at
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.order_id
       LEFT JOIN payments p ON p.order_id = o.order_id
       WHERE o.order_id = $1
       GROUP BY o.order_id, o.status, p.discount_amount, p.payment_id,
                p.payment_status, p.payment_method, p.paid_at`,
      [orderId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Order not found" });
    const row = result.rows[0];
    if (Number(row.item_count) === 0) return res.status(409).json({ message: "Order has no items to bill" });
    const subtotalCents = databaseAmountToCents(row.subtotal);
    const discountCents = databaseAmountToCents(row.discount_amount);
    if (subtotalCents === null || discountCents === null || discountCents > subtotalCents) {
      return res.status(500).json({ message: "Stored order or payment amounts are invalid" });
    }
    return res.json({
      order_id: row.order_id,
      order_status: row.order_status,
      subtotal: centsToDecimal(subtotalCents),
      discount_amount: centsToDecimal(discountCents),
      final_amount: centsToDecimal(subtotalCents - discountCents),
      payment_id: row.payment_id,
      payment_status: row.payment_status,
      payment_method: row.payment_method,
      paid_at: row.paid_at
    });
  } catch (error) {
    console.error("Could not calculate order bill:", error.message);
    return res.status(500).json({ message: "Failed to calculate order bill" });
  }
});

module.exports = { paymentsRouter, orderPaymentRouter, billingRouter };
