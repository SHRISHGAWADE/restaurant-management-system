const express = require("express");
const router = express.Router();
const pool = require("../db");

const BIGINT_MAX = "9223372036854775807";
const STAFF_COLUMNS = "staff_id, staff_name, role, date_of_birth, is_active";

function validStaffId(id) {
  return typeof id === "string" && /^[1-9]\d*$/.test(id) &&
    (id.length < BIGINT_MAX.length || (id.length === BIGINT_MAX.length && id <= BIGINT_MAX));
}

function isObjectBody(body) {
  return body && typeof body === "object" && !Array.isArray(body);
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= daysInMonth[month - 1];
}

function validateStaffFields(body, { partial = false } = {}) {
  const values = {};
  const fields = ["staff_name", "role", "date_of_birth", "is_active"];
  for (const field of fields) {
    if (partial && !Object.prototype.hasOwnProperty.call(body, field)) continue;
    const value = body[field];
    if (field === "staff_name") {
      if (typeof value !== "string" || !value.trim() || value.trim().length > 100) {
        return { error: "staff_name is required and must be at most 100 characters" };
      }
      values[field] = value.trim();
    } else if (field === "role") {
      if (typeof value !== "string" || !value.trim() || value.trim().length > 40) {
        return { error: "role is required and must be at most 40 characters" };
      }
      values[field] = value.trim();
    } else if (field === "date_of_birth") {
      if (value !== undefined && value !== null && value !== "" && !validDate(value)) {
        return { error: "date_of_birth must be a valid YYYY-MM-DD date or null" };
      }
      values[field] = value === undefined || value === "" ? null : value;
    } else {
      if (typeof value !== "boolean") return { error: "is_active must be a boolean" };
      values[field] = value;
    }
  }
  return { values };
}

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${STAFF_COLUMNS} FROM staff ORDER BY staff_id`);
    return res.json(result.rows);
  } catch (error) {
    console.error("Could not retrieve staff:", error.message);
    return res.status(500).json({ message: "Failed to retrieve staff" });
  }
});

router.get("/:id", async (req, res) => {
  if (!validStaffId(req.params.id)) {
    return res.status(400).json({ message: "Staff ID must be a positive integer" });
  }
  try {
    const result = await pool.query(`SELECT ${STAFF_COLUMNS} FROM staff WHERE staff_id = $1`, [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Staff member not found" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Could not retrieve staff member:", error.message);
    return res.status(500).json({ message: "Failed to retrieve staff member" });
  }
});

router.post("/", async (req, res) => {
  if (!isObjectBody(req.body)) return res.status(400).json({ message: "A staff object is required" });
  const body = { is_active: true, ...req.body };
  const validation = validateStaffFields(body);
  if (validation.error) return res.status(400).json({ message: validation.error });
  const { staff_name, role, date_of_birth, is_active } = validation.values;

  try {
    const result = await pool.query(
      `INSERT INTO staff (staff_name, role, date_of_birth, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING ${STAFF_COLUMNS}`,
      [staff_name, role, date_of_birth ?? null, is_active]
    );
    return res.status(201).json({ message: "Staff member added successfully", staff: result.rows[0] });
  } catch (error) {
    console.error("Could not add staff member:", error.message);
    return res.status(500).json({ message: "Failed to add staff member" });
  }
});

router.put("/:id", async (req, res) => {
  if (!validStaffId(req.params.id)) {
    return res.status(400).json({ message: "Staff ID must be a positive integer" });
  }
  if (!isObjectBody(req.body)) return res.status(400).json({ message: "A staff update object is required" });
  const allowed = ["staff_name", "role", "date_of_birth", "is_active"];
  const provided = allowed.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field));
  if (provided.length === 0) return res.status(400).json({ message: "Provide at least one staff field to update" });

  const validation = validateStaffFields(req.body, { partial: true });
  if (validation.error) return res.status(400).json({ message: validation.error });
  const values = [];
  const assignments = [];
  for (const field of provided) {
    values.push(validation.values[field]);
    assignments.push(`${field} = $${values.length}`);
  }
  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE staff SET ${assignments.join(", ")} WHERE staff_id = $${values.length}
       RETURNING ${STAFF_COLUMNS}`,
      values
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Staff member not found" });
    return res.json({ message: "Staff member updated successfully", staff: result.rows[0] });
  } catch (error) {
    console.error("Could not update staff member:", error.message);
    return res.status(500).json({ message: "Failed to update staff member" });
  }
});

router.delete("/:id", async (req, res) => {
  if (!validStaffId(req.params.id)) {
    return res.status(400).json({ message: "Staff ID must be a positive integer" });
  }
  try {
    const result = await pool.query(
      "DELETE FROM staff WHERE staff_id = $1 RETURNING staff_id",
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Staff member not found" });
    return res.json({ message: "Staff member deleted successfully", staff_id: result.rows[0].staff_id });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({ message: "Staff member cannot be deleted while orders or order items reference them" });
    }
    console.error("Could not delete staff member:", error.message);
    return res.status(500).json({ message: "Failed to delete staff member" });
  }
});

module.exports = router;
