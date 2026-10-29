const express = require("express");
const router = express.Router();
const pool = require("../db");

const RESERVATION_STATUSES = new Set(["pending", "confirmed", "cancelled", "completed"]);

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= daysInMonth[month - 1];
}

function validateDateRange(query, res) {
  const from = query.from;
  const to = query.to;
  if (from !== undefined && !validDate(from)) {
    res.status(400).json({ message: "from must be a valid YYYY-MM-DD date" });
    return null;
  }
  if (to !== undefined && !validDate(to)) {
    res.status(400).json({ message: "to must be a valid YYYY-MM-DD date" });
    return null;
  }
  if (from !== undefined && to !== undefined && from > to) {
    res.status(400).json({ message: "from must be on or before to" });
    return null;
  }
  return { from: from ?? null, to: to ?? null };
}

router.get("/overview", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM customers) AS total_customers,
         (SELECT COUNT(*) FROM reservations) AS total_reservations,
         (SELECT COUNT(*) FROM orders) AS total_orders,
         (SELECT COUNT(*) FROM restaurant_tables WHERE status = 'available') AS available_tables,
         COALESCE((
           SELECT SUM(total_amount)
           FROM payments
           WHERE payment_status = 'paid' AND paid_at IS NOT NULL
         ), 0) AS successful_payment_revenue`
    );
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Could not retrieve report overview:", error.message);
    return res.status(500).json({ message: "Failed to retrieve report overview" });
  }
});

router.get("/revenue", async (req, res) => {
  const range = validateDateRange(req.query, res);
  if (!range) return;
  try {
    const result = await pool.query(
      `SELECT DATE(paid_at) AS revenue_date,
              COUNT(*) AS successful_payment_count,
              SUM(total_amount) AS total_revenue
       FROM payments
       WHERE payment_status = 'paid'
         AND paid_at IS NOT NULL
         AND ($1::date IS NULL OR DATE(paid_at) >= $1::date)
         AND ($2::date IS NULL OR DATE(paid_at) <= $2::date)
       GROUP BY DATE(paid_at)
       ORDER BY revenue_date DESC`,
      [range.from, range.to]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Could not retrieve revenue report:", error.message);
    return res.status(500).json({ message: "Failed to retrieve revenue report" });
  }
});

router.get("/popular-menu-items", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.menu_item_id, m.food_name,
              SUM(oi.quantity) AS quantity_sold,
              SUM(oi.quantity * oi.unit_price) AS sales_value
       FROM order_items oi
       JOIN menu_items m ON m.menu_item_id = oi.menu_item_id
       JOIN orders o ON o.order_id = oi.order_id
       WHERE o.status <> 'cancelled'
       GROUP BY m.menu_item_id, m.food_name
       HAVING SUM(oi.quantity) >= 2
       ORDER BY quantity_sold DESC, m.food_name ASC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Could not retrieve popular menu items report:", error.message);
    return res.status(500).json({ message: "Failed to retrieve popular menu items report" });
  }
});

router.get("/staff-performance", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.staff_id, s.staff_name, s.role,
              COUNT(o.order_id) AS orders_handled
       FROM staff s
       LEFT JOIN orders o ON o.accepted_by_staff_id = s.staff_id
       GROUP BY s.staff_id, s.staff_name, s.role
       ORDER BY orders_handled DESC, s.staff_name ASC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Could not retrieve staff performance report:", error.message);
    return res.status(500).json({ message: "Failed to retrieve staff performance report" });
  }
});

router.get("/reservations", async (req, res) => {
  const range = validateDateRange(req.query, res);
  if (!range) return;
  const exactDate = req.query.date;
  if (exactDate !== undefined && !validDate(exactDate)) {
    return res.status(400).json({ message: "date must be a valid YYYY-MM-DD date" });
  }
  const status = req.query.status;
  if (status !== undefined && !RESERVATION_STATUSES.has(status)) {
    return res.status(400).json({ message: "status must be pending, confirmed, cancelled, or completed" });
  }

  const conditions = [];
  const values = [];
  if (exactDate !== undefined) {
    values.push(exactDate);
    conditions.push(`r.reservation_date = $${values.length}::date`);
  }
  if (range.from !== null) {
    values.push(range.from);
    conditions.push(`r.reservation_date >= $${values.length}::date`);
  }
  if (range.to !== null) {
    values.push(range.to);
    conditions.push(`r.reservation_date <= $${values.length}::date`);
  }
  if (status !== undefined) {
    values.push(status);
    conditions.push(`r.status = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  try {
    const result = await pool.query(
      `SELECT r.reservation_id, r.customer_id, c.customer_name, c.phone_number,
              r.table_number, t.capacity AS table_capacity,
              r.reservation_date, r.reservation_time, r.party_size, r.status
       FROM reservations r
       JOIN customers c ON c.customer_id = r.customer_id
       JOIN restaurant_tables t ON t.table_number = r.table_number
       ${whereClause}
       ORDER BY r.reservation_date, r.reservation_time, r.reservation_id`,
      values
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Could not retrieve reservations report:", error.message);
    return res.status(500).json({ message: "Failed to retrieve reservations report" });
  }
});

router.get("/order-status", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT status AS order_status, COUNT(*) AS order_count
       FROM orders
       GROUP BY status
       ORDER BY order_count DESC, order_status ASC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Could not retrieve order status report:", error.message);
    return res.status(500).json({ message: "Failed to retrieve order status report" });
  }
});

router.get("/payment-status", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT payment_status, COUNT(*) AS payment_count,
              SUM(total_amount) AS total_amount
       FROM payments
       GROUP BY payment_status
       ORDER BY payment_count DESC, payment_status ASC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Could not retrieve payment status report:", error.message);
    return res.status(500).json({ message: "Failed to retrieve payment status report" });
  }
});

module.exports = router;
