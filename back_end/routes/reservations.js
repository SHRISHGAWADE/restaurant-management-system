const express = require("express");
const router = express.Router();
const pool = require("../db");

const RESERVATION_STATUSES = new Set(["pending", "confirmed", "cancelled", "completed"]);
const BIGINT_MAX = "9223372036854775807";
const RESERVATION_SELECT = `
  SELECT r.reservation_id, r.customer_id, c.customer_name,
         r.table_number, t.capacity AS table_capacity,
         r.reservation_date, r.reservation_time, r.party_size, r.status
  FROM reservations r
  JOIN customers c ON c.customer_id = r.customer_id
  JOIN restaurant_tables t ON t.table_number = r.table_number`;

function isObjectBody(body) {
  return body && typeof body === "object" && !Array.isArray(body);
}

function validBigintId(value) {
  const text = String(value);
  return /^[1-9]\d*$/.test(text) &&
    (text.length < BIGINT_MAX.length || (text.length === BIGINT_MAX.length && text <= BIGINT_MAX));
}

function parseCustomerId(value) {
  if (typeof value === "number" && !Number.isSafeInteger(value)) return null;
  if ((typeof value !== "string" && typeof value !== "number") || !validBigintId(value)) return null;
  return String(value);
}

function parseTableNumber(value) {
  if ((typeof value !== "string" && typeof value !== "number") || !/^\d+$/.test(String(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 && number <= 2147483647 ? number : null;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= daysInMonth[month - 1];
}

function validTime(value) {
  if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) return false;
  return true;
}

function parsePartySize(value) {
  if (typeof value === "string" && /^\d+$/.test(value)) value = Number(value);
  return Number.isInteger(value) && value >= 1 && value <= 32767 ? value : null;
}

async function validateCustomerAndTable(customerId, tableNumber, partySize, res) {
  const customerResult = await pool.query(
    "SELECT customer_id FROM customers WHERE customer_id = $1",
    [customerId]
  );
  if (customerResult.rowCount === 0) {
    res.status(404).json({ message: "Customer not found" });
    return false;
  }

  const tableResult = await pool.query(
    "SELECT table_number, capacity, status FROM restaurant_tables WHERE table_number = $1",
    [tableNumber]
  );
  if (tableResult.rowCount === 0) {
    res.status(404).json({ message: "Restaurant table not found" });
    return false;
  }
  const table = tableResult.rows[0];
  if (partySize > table.capacity) {
    res.status(400).json({ message: `Party size exceeds table capacity (${table.capacity})` });
    return false;
  }
  if (table.status === "maintenance") {
    res.status(409).json({ message: "Cannot book a table that is under maintenance" });
    return false;
  }
  return true;
}

function handleDatabaseConflict(error, res) {
  if (error.code === "23505") {
    res.status(409).json({ message: "That table already has a reservation at the requested date and time" });
    return true;
  }
  if (error.code === "23503") {
    res.status(409).json({ message: "The customer or restaurant table no longer exists" });
    return true;
  }
  return false;
}

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`${RESERVATION_SELECT} ORDER BY r.reservation_date, r.reservation_time, r.reservation_id`);
    return res.json(result.rows);
  } catch (error) {
    console.error("Could not retrieve reservations:", error.message);
    return res.status(500).json({ message: "Failed to retrieve reservations" });
  }
});

router.get("/:id", async (req, res) => {
  if (!validBigintId(req.params.id)) {
    return res.status(400).json({ message: "Reservation ID must be a positive integer" });
  }
  try {
    const result = await pool.query(`${RESERVATION_SELECT} WHERE r.reservation_id = $1`, [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Reservation not found" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Could not retrieve reservation:", error.message);
    return res.status(500).json({ message: "Failed to retrieve reservation" });
  }
});

router.post("/", async (req, res) => {
  if (!isObjectBody(req.body)) return res.status(400).json({ message: "A reservation object is required" });
  const body = req.body;
  const customerId = parseCustomerId(body.customer_id);
  const tableNumber = parseTableNumber(body.table_number);
  const partySize = parsePartySize(body.party_size);
  const status = body.status === undefined ? "confirmed" : body.status;

  if (customerId === null) return res.status(400).json({ message: "Valid customer_id is required" });
  if (tableNumber === null) return res.status(400).json({ message: "Valid table_number is required" });
  if (!validDate(body.reservation_date)) return res.status(400).json({ message: "reservation_date must be a valid YYYY-MM-DD date" });
  if (!validTime(body.reservation_time)) return res.status(400).json({ message: "reservation_time must be a valid HH:MM or HH:MM:SS time" });
  if (partySize === null) return res.status(400).json({ message: "party_size must be a positive whole number up to 32767" });
  if (typeof status !== "string" || !RESERVATION_STATUSES.has(status)) {
    return res.status(400).json({ message: "status must be pending, confirmed, cancelled, or completed" });
  }

  try {
    if (!await validateCustomerAndTable(customerId, tableNumber, partySize, res)) return;
    const result = await pool.query(
      `INSERT INTO reservations (customer_id, table_number, reservation_date, reservation_time, party_size, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING reservation_id`,
      [customerId, tableNumber, body.reservation_date, body.reservation_time, partySize, status]
    );
    const reservation = await pool.query(`${RESERVATION_SELECT} WHERE r.reservation_id = $1`, [result.rows[0].reservation_id]);
    return res.status(201).json({ message: "Reservation created successfully", reservation: reservation.rows[0] });
  } catch (error) {
    if (handleDatabaseConflict(error, res)) return;
    if (error.code === "23514") return res.status(400).json({ message: "Reservation values violate a database constraint" });
    console.error("Could not create reservation:", error.message);
    return res.status(500).json({ message: "Failed to create reservation" });
  }
});

router.put("/:id", async (req, res) => {
  if (!validBigintId(req.params.id)) {
    return res.status(400).json({ message: "Reservation ID must be a positive integer" });
  }
  if (!isObjectBody(req.body)) return res.status(400).json({ message: "A reservation update object is required" });
  const allowedFields = ["customer_id", "table_number", "reservation_date", "reservation_time", "party_size", "status"];
  const providedFields = allowedFields.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field));
  if (providedFields.length === 0) return res.status(400).json({ message: "Provide at least one reservation field to update" });

  try {
    const existingResult = await pool.query(
      `SELECT reservation_id, customer_id, table_number, reservation_date, reservation_time, party_size, status
       FROM reservations WHERE reservation_id = $1`,
      [req.params.id]
    );
    if (existingResult.rowCount === 0) return res.status(404).json({ message: "Reservation not found" });
    const existing = existingResult.rows[0];
    const candidate = { ...existing, ...req.body };

    const customerId = parseCustomerId(candidate.customer_id);
    const tableNumber = parseTableNumber(candidate.table_number);
    const partySize = parsePartySize(candidate.party_size);
    if (customerId === null) return res.status(400).json({ message: "customer_id must be a positive integer" });
    if (tableNumber === null) return res.status(400).json({ message: "table_number must be a positive 32-bit integer" });
    if (!validDate(candidate.reservation_date)) return res.status(400).json({ message: "reservation_date must be a valid YYYY-MM-DD date" });
    if (!validTime(candidate.reservation_time)) return res.status(400).json({ message: "reservation_time must be a valid HH:MM or HH:MM:SS time" });
    if (partySize === null) return res.status(400).json({ message: "party_size must be a positive whole number up to 32767" });
    if (typeof candidate.status !== "string" || !RESERVATION_STATUSES.has(candidate.status)) {
      return res.status(400).json({ message: "status must be pending, confirmed, cancelled, or completed" });
    }

    if (!await validateCustomerAndTable(customerId, tableNumber, partySize, res)) return;

    const normalized = {
      customer_id: customerId,
      table_number: tableNumber,
      reservation_date: candidate.reservation_date,
      reservation_time: candidate.reservation_time,
      party_size: partySize,
      status: candidate.status
    };
    const values = [];
    const assignments = [];
    for (const field of providedFields) {
      values.push(normalized[field]);
      assignments.push(`${field} = $${values.length}`);
    }
    values.push(req.params.id);

    await pool.query(
      `UPDATE reservations SET ${assignments.join(", ")} WHERE reservation_id = $${values.length}`,
      values
    );
    const updated = await pool.query(`${RESERVATION_SELECT} WHERE r.reservation_id = $1`, [req.params.id]);
    return res.json({ message: "Reservation updated successfully", reservation: updated.rows[0] });
  } catch (error) {
    if (handleDatabaseConflict(error, res)) return;
    if (error.code === "23514") return res.status(400).json({ message: "Reservation values violate a database constraint" });
    console.error("Could not update reservation:", error.message);
    return res.status(500).json({ message: "Failed to update reservation" });
  }
});

router.delete("/:id", async (req, res) => {
  if (!validBigintId(req.params.id)) {
    return res.status(400).json({ message: "Reservation ID must be a positive integer" });
  }
  try {
    const result = await pool.query(
      `UPDATE reservations SET status = 'cancelled' WHERE reservation_id = $1
       RETURNING reservation_id, customer_id, table_number, reservation_date, reservation_time, party_size, status`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Reservation not found" });
    const reservation = await pool.query(`${RESERVATION_SELECT} WHERE r.reservation_id = $1`, [req.params.id]);
    return res.json({ message: "Reservation cancelled successfully", reservation: reservation.rows[0] });
  } catch (error) {
    console.error("Could not cancel reservation:", error.message);
    return res.status(500).json({ message: "Failed to cancel reservation" });
  }
});

module.exports = router;
