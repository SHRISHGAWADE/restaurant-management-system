
const express = require("express");
const router = express.Router();
const pool = require("../db");

function validCustomerId(id) {
  if (typeof id !== "string" || !/^[1-9]\d*$/.test(id)) return false;
  const maxBigint = "9223372036854775807";
  return id.length < maxBigint.length || (id.length === maxBigint.length && id <= maxBigint);
}

function parseFamilySize(value) {
  if (value === undefined || value === null || value === "") return { value: null };
  if (typeof value !== "number" && typeof value !== "string") return { error: true };
  const text = typeof value === "string" ? value.trim() : value;
  if (typeof text === "string" && !/^\d+$/.test(text)) return { error: true };
  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 32767) return { error: true };
  return { value: parsed };
}

function optionalString(value, field, maxLength = Infinity) {
  if (value === undefined || value === null || value === "") return { value: null };
  if (typeof value !== "string" || value.length > maxLength) {
    return { error: Number.isFinite(maxLength) ? `${field} must be a string of at most ${maxLength} characters` : `${field} must be a string` };
  }
  return { value: value.trim() || null };
}

function validEmail(value) {
  return value === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function duplicateEmail(error, res) {
  if (error.code === "23505" && error.constraint === "customers_email_key") {
    res.status(409).json({ message: "That email address already exists" });
    return true;
  }
  return false;
}

// GET /api/customers
// Retrieve all customers from PostgreSQL.
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        customer_id,
        customer_name,
        email,
        phone_number,
        address,
        family_size
      FROM customers
      ORDER BY customer_id
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Could not retrieve customers:", error.message);

    res.status(500).json({
      message: "Failed to retrieve customers"
    });
  }
});

// GET /api/customers/:id
router.get("/:id", async (req, res) => {
  if (!validCustomerId(req.params.id)) {
    return res.status(400).json({ message: "Customer ID must be a positive integer" });
  }
  try {
    const result = await pool.query(
      `SELECT customer_id, customer_name, email, phone_number, address, family_size
       FROM customers WHERE customer_id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Customer not found" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Could not retrieve customer:", error.message);
    return res.status(500).json({ message: "Failed to retrieve customer" });
  }
});

// POST /api/customers
// Insert a new customer into PostgreSQL.
router.post("/", async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({ message: "A customer object is required" });
    }
    const {
      customer_name,
      email,
      phone_number,
      address,
      family_size
    } = req.body;

    if (typeof customer_name !== "string" || !customer_name.trim() || customer_name.trim().length > 100) {
      return res.status(400).json({
        message: "Customer name is required and must be at most 100 characters"
      });
    }

    const parsedEmail = optionalString(email, "Email", 255);
    const parsedPhone = optionalString(phone_number, "Phone number", 20);
    const parsedAddress = optionalString(address, "Address");
    const parsedFamilySize = parseFamilySize(family_size);
    const invalidOptional = [parsedEmail, parsedPhone, parsedAddress].find((field) => field.error);
    if (invalidOptional) return res.status(400).json({ message: invalidOptional.error });
    if (!validEmail(parsedEmail.value)) return res.status(400).json({ message: "Email must be a valid email address" });
    if (parsedFamilySize.error) {
      return res.status(400).json({ message: "Family size must be a positive whole number" });
    }

    const result = await pool.query(
      `INSERT INTO customers (
        customer_name,
        email,
        phone_number,
        address,
        family_size
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        customer_name.trim(),
        parsedEmail.value,
        parsedPhone.value,
        parsedAddress.value,
        parsedFamilySize.value
      ]
    );

    res.status(201).json({
      message: "Customer added successfully",
      customer: result.rows[0]
    });
  } catch (error) {
    if (duplicateEmail(error, res)) return;

    console.error("Could not add customer:", error.message);

    res.status(500).json({
      message: "Failed to add customer"
    });
  }
});

// PUT /api/customers/:id
router.put("/:id", async (req, res) => {
  if (!validCustomerId(req.params.id)) {
    return res.status(400).json({ message: "Customer ID must be a positive integer" });
  }
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ message: "A customer object is required" });
  }
  if (typeof body.customer_name !== "string" || !body.customer_name.trim() || body.customer_name.trim().length > 100) {
    return res.status(400).json({ message: "Customer name is required and must be at most 100 characters" });
  }

  const email = optionalString(body.email, "Email", 255);
  const phone = optionalString(body.phone_number, "Phone number", 20);
  const address = optionalString(body.address, "Address");
  const familySize = parseFamilySize(body.family_size);
  const invalid = [email, phone, address].find((field) => field.error);
  if (invalid) return res.status(400).json({ message: invalid.error });
  if (!validEmail(email.value)) return res.status(400).json({ message: "Email must be a valid email address" });
  if (familySize.error) return res.status(400).json({ message: "Family size must be a positive whole number" });

  try {
    const result = await pool.query(
      `UPDATE customers
       SET customer_name = $1, email = $2, phone_number = $3, address = $4, family_size = $5
       WHERE customer_id = $6
       RETURNING customer_id, customer_name, email, phone_number, address, family_size`,
      [body.customer_name.trim(), email.value, phone.value, address.value, familySize.value, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Customer not found" });
    return res.json({ message: "Customer updated successfully", customer: result.rows[0] });
  } catch (error) {
    if (duplicateEmail(error, res)) return;
    console.error("Could not update customer:", error.message);
    return res.status(500).json({ message: "Failed to update customer" });
  }
});

// DELETE /api/customers/:id
router.delete("/:id", async (req, res) => {
  if (!validCustomerId(req.params.id)) {
    return res.status(400).json({ message: "Customer ID must be a positive integer" });
  }
  try {
    const result = await pool.query(
      "DELETE FROM customers WHERE customer_id = $1 RETURNING customer_id",
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Customer not found" });
    return res.json({ message: "Customer deleted successfully", customer_id: result.rows[0].customer_id });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({ message: "Customer cannot be deleted while reservations or orders reference them" });
    }
    console.error("Could not delete customer:", error.message);
    return res.status(500).json({ message: "Failed to delete customer" });
  }
});

module.exports = router;
