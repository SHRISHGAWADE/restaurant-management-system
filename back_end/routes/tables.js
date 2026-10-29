const express = require("express");
const router = express.Router();
const pool = require("../db");

const TABLE_STATUSES = new Set(["available", "occupied", "maintenance"]);

function validTableNumber(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return false;
  const number = Number(value);
  return Number.isSafeInteger(number) && number <= 2147483647;
}

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT table_number, capacity, status FROM restaurant_tables ORDER BY table_number"
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Could not retrieve restaurant tables:", error.message);
    return res.status(500).json({ message: "Failed to retrieve restaurant tables" });
  }
});

router.get("/:number", async (req, res) => {
  if (!validTableNumber(req.params.number)) {
    return res.status(400).json({ message: "Table number must be a positive 32-bit integer" });
  }
  try {
    const result = await pool.query(
      "SELECT table_number, capacity, status FROM restaurant_tables WHERE table_number = $1",
      [req.params.number]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Table not found" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Could not retrieve restaurant table:", error.message);
    return res.status(500).json({ message: "Failed to retrieve restaurant table" });
  }
});

router.put("/:number", async (req, res) => {
  if (!validTableNumber(req.params.number)) {
    return res.status(400).json({ message: "Table number must be a positive 32-bit integer" });
  }
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ message: "A table update object is required" });
  }
  const hasCapacity = Object.prototype.hasOwnProperty.call(body, "capacity");
  const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
  if (!hasCapacity && !hasStatus) {
    return res.status(400).json({ message: "Provide capacity and/or status to update" });
  }
  if (hasCapacity && (!Number.isInteger(body.capacity) || body.capacity < 1 || body.capacity > 32767)) {
    return res.status(400).json({ message: "Capacity must be a positive whole number up to 32767" });
  }
  if (hasStatus && (typeof body.status !== "string" || !TABLE_STATUSES.has(body.status))) {
    return res.status(400).json({ message: "Status must be available, occupied, or maintenance" });
  }

  const assignments = [];
  const values = [];
  if (hasCapacity) {
    values.push(body.capacity);
    assignments.push(`capacity = $${values.length}`);
  }
  if (hasStatus) {
    values.push(body.status);
    assignments.push(`status = $${values.length}`);
  }
  values.push(req.params.number);

  try {
    const result = await pool.query(
      `UPDATE restaurant_tables SET ${assignments.join(", ")} WHERE table_number = $${values.length}
       RETURNING table_number, capacity, status`,
      values
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Table not found" });
    return res.json({ message: "Table updated successfully", table: result.rows[0] });
  } catch (error) {
    console.error("Could not update restaurant table:", error.message);
    return res.status(500).json({ message: "Failed to update restaurant table" });
  }
});

module.exports = router;
