const express = require("express");
const router = express.Router();
const pool = require("../db");

const BIGINT_MAX = "9223372036854775807";
const ORDER_STATUSES = new Set(["placed", "preparing", "served", "completed", "cancelled"]);

function isObjectBody(body) {
  return body && typeof body === "object" && !Array.isArray(body);
}

function validBigintId(value) {
  const text = String(value);
  return /^[1-9]\d*$/.test(text) &&
    (text.length < BIGINT_MAX.length || (text.length === BIGINT_MAX.length && text <= BIGINT_MAX));
}

function parseBigintId(value, fieldName) {
  if ((typeof value !== "string" && typeof value !== "number") ||
      (typeof value === "number" && !Number.isSafeInteger(value)) || !validBigintId(value)) {
    return { error: `${fieldName} must be a positive integer` };
  }
  return { value: String(value) };
}

function parseTableNumber(value) {
  if ((typeof value !== "string" && typeof value !== "number") || !/^\d+$/.test(String(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 && number <= 2147483647 ? number : null;
}

function parseQuantity(value) {
  if (typeof value === "string" && /^\d+$/.test(value)) value = Number(value);
  return Number.isInteger(value) && value > 0 && value <= 2147483647 ? value : null;
}

function databaseReferenceConflict(error, res) {
  if (error.code === "23503") {
    res.status(409).json({ message: "A customer, table, staff member, or menu item referenced by the order no longer exists" });
    return true;
  }
  return false;
}

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.order_id, o.customer_id, c.customer_name, o.table_number,
              o.accepted_by_staff_id, s.staff_name, o.created_at, o.status,
              COALESCE((
                SELECT SUM(oi.quantity * oi.unit_price)
                FROM order_items oi
                WHERE oi.order_id = o.order_id
              ), 0) AS bill_subtotal
       FROM orders o
       JOIN customers c ON c.customer_id = o.customer_id
       LEFT JOIN staff s ON s.staff_id = o.accepted_by_staff_id
       ORDER BY o.created_at DESC, o.order_id DESC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Could not retrieve orders:", error.message);
    return res.status(500).json({ message: "Failed to retrieve orders" });
  }
});

router.get("/:id", async (req, res) => {
  if (!validBigintId(req.params.id)) {
    return res.status(400).json({ message: "Order ID must be a positive integer" });
  }
  try {
    const orderResult = await pool.query(
      `SELECT o.order_id, o.customer_id, c.customer_name, o.table_number,
              o.accepted_by_staff_id, s.staff_name, o.created_at, o.status,
              COALESCE((
                SELECT SUM(oi.quantity * oi.unit_price)
                FROM order_items oi WHERE oi.order_id = o.order_id
              ), 0) AS bill_subtotal
       FROM orders o
       JOIN customers c ON c.customer_id = o.customer_id
       LEFT JOIN staff s ON s.staff_id = o.accepted_by_staff_id
       WHERE o.order_id = $1`,
      [req.params.id]
    );
    if (orderResult.rowCount === 0) return res.status(404).json({ message: "Order not found" });

    const itemResult = await pool.query(
      `SELECT oi.item_no, oi.menu_item_id, mi.food_name, oi.quantity, oi.unit_price,
              oi.served_by_staff_id
       FROM order_items oi
       JOIN menu_items mi ON mi.menu_item_id = oi.menu_item_id
       WHERE oi.order_id = $1
       ORDER BY oi.item_no`,
      [req.params.id]
    );
    return res.json({ ...orderResult.rows[0], items: itemResult.rows });
  } catch (error) {
    console.error("Could not retrieve order:", error.message);
    return res.status(500).json({ message: "Failed to retrieve order" });
  }
});

router.post("/", async (req, res) => {
  if (!isObjectBody(req.body)) return res.status(400).json({ message: "An order object is required" });
  const body = req.body;
  const customer = parseBigintId(body.customer_id, "customer_id");
  const tableNumber = parseTableNumber(body.table_number);
  const staff = body.accepted_by_staff_id === undefined || body.accepted_by_staff_id === null || body.accepted_by_staff_id === ""
    ? { value: null }
    : parseBigintId(body.accepted_by_staff_id, "accepted_by_staff_id");
  if (customer.error) return res.status(400).json({ message: customer.error });
  if (tableNumber === null) return res.status(400).json({ message: "table_number must be a positive 32-bit integer" });
  if (staff.error) return res.status(400).json({ message: staff.error });
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 32767) {
    return res.status(400).json({ message: "items must be a non-empty array with at most 32767 entries" });
  }

  const requestedItems = [];
  for (let index = 0; index < body.items.length; index += 1) {
    const item = body.items[index];
    if (!isObjectBody(item)) return res.status(400).json({ message: `items[${index}] must be an object` });
    const menuItem = parseBigintId(item.menu_item_id, `items[${index}].menu_item_id`);
    if (menuItem.error) return res.status(400).json({ message: menuItem.error });
    const quantity = parseQuantity(item.quantity);
    if (quantity === null) return res.status(400).json({ message: `items[${index}].quantity must be a positive 32-bit integer` });
    requestedItems.push({ menu_item_id: menuItem.value, quantity });
  }

  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const customerResult = await client.query("SELECT customer_id FROM customers WHERE customer_id = $1", [customer.value]);
    if (customerResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(404).json({ message: "Customer not found" });
    }

    const tableResult = await client.query("SELECT table_number FROM restaurant_tables WHERE table_number = $1", [tableNumber]);
    if (tableResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(404).json({ message: "Restaurant table not found" });
    }

    if (staff.value !== null) {
      const staffResult = await client.query("SELECT staff_id FROM staff WHERE staff_id = $1", [staff.value]);
      if (staffResult.rowCount === 0) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return res.status(404).json({ message: "Staff member not found" });
      }
    }

    const menuIds = [...new Set(requestedItems.map((item) => item.menu_item_id))];
    const menuResult = await client.query(
      `SELECT menu_item_id, food_name, current_price, is_available
       FROM menu_items WHERE menu_item_id = ANY($1::bigint[]) FOR SHARE`,
      [menuIds]
    );
    const menuById = new Map(menuResult.rows.map((item) => [String(item.menu_item_id), item]));
    const missingMenuId = menuIds.find((id) => !menuById.has(id));
    if (missingMenuId) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(404).json({ message: `Menu item ${missingMenuId} not found` });
    }
    const unavailableItem = menuResult.rows.find((item) => !item.is_available);
    if (unavailableItem) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(409).json({ message: `Menu item '${unavailableItem.food_name}' is unavailable` });
    }

    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, table_number, accepted_by_staff_id)
       VALUES ($1, $2, $3)
       RETURNING order_id`,
      [customer.value, tableNumber, staff.value]
    );
    const orderId = orderResult.rows[0].order_id;

    for (let index = 0; index < requestedItems.length; index += 1) {
      const requested = requestedItems[index];
      const menuItem = menuById.get(requested.menu_item_id);
      await client.query(
        `INSERT INTO order_items (order_id, item_no, menu_item_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, index + 1, requested.menu_item_id, requested.quantity, menuItem.current_price]
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;
    return res.status(201).json({
      message: "Order created successfully",
      order_id: orderId,
      status: "placed",
      items: requestedItems.map((requested, index) => {
        const menuItem = menuById.get(requested.menu_item_id);
        return {
          item_no: index + 1,
          menu_item_id: requested.menu_item_id,
          food_name: menuItem.food_name,
          quantity: requested.quantity,
          unit_price: menuItem.current_price
        };
      })
    });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Could not roll back order transaction:", rollbackError.message);
      }
    }
    if (error.code === "23514" || error.code === "22003") {
      return res.status(400).json({ message: "Order values violate a database constraint" });
    }
    if (databaseReferenceConflict(error, res)) return;
    console.error("Could not create order:", error.message);
    return res.status(500).json({ message: "Failed to create order" });
  } finally {
    if (client) client.release();
  }
});

router.put("/:id", async (req, res) => {
  if (!validBigintId(req.params.id)) {
    return res.status(400).json({ message: "Order ID must be a positive integer" });
  }
  if (!isObjectBody(req.body) || typeof req.body.status !== "string" || !ORDER_STATUSES.has(req.body.status)) {
    return res.status(400).json({ message: "status must be placed, preparing, served, completed, or cancelled" });
  }
  try {
    const result = await pool.query(
      "UPDATE orders SET status = $1 WHERE order_id = $2 RETURNING order_id, customer_id, table_number, accepted_by_staff_id, created_at, status",
      [req.body.status, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Order not found" });
    return res.json({ message: "Order status updated successfully", order: result.rows[0] });
  } catch (error) {
    console.error("Could not update order status:", error.message);
    return res.status(500).json({ message: "Failed to update order status" });
  }
});

module.exports = router;
