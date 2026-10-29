const express = require("express");
const router = express.Router();
const pool = require("../db");

function validMenuId(id) {
  if (typeof id !== "string" || !/^[1-9]\d*$/.test(id)) return false;
  const maxBigint = "9223372036854775807";
  return id.length < maxBigint.length || (id.length === maxBigint.length && id <= maxBigint);
}

function parsePrice(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount > 99999999.99) return null;
  return text;
}

function isObjectBody(body) {
  return body && typeof body === "object" && !Array.isArray(body);
}

function handleDuplicateFoodName(error, res) {
  if (error.code === "23505" && error.constraint === "menu_items_food_name_key") {
    res.status(409).json({ message: "That food name already exists" });
    return true;
  }
  return false;
}

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT menu_item_id, food_name, current_price, is_available FROM menu_items ORDER BY menu_item_id"
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Could not retrieve menu items:", error.message);
    return res.status(500).json({ message: "Failed to retrieve menu items" });
  }
});

router.get("/:id", async (req, res) => {
  if (!validMenuId(req.params.id)) {
    return res.status(400).json({ message: "Menu item ID must be a positive integer" });
  }
  try {
    const result = await pool.query(
      "SELECT menu_item_id, food_name, current_price, is_available FROM menu_items WHERE menu_item_id = $1",
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Menu item not found" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Could not retrieve menu item:", error.message);
    return res.status(500).json({ message: "Failed to retrieve menu item" });
  }
});

router.post("/", async (req, res) => {
  if (!isObjectBody(req.body)) {
    return res.status(400).json({ message: "A menu item object is required" });
  }
  const { food_name, current_price } = req.body;
  const isAvailable = req.body.is_available === undefined ? true : req.body.is_available;
  if (typeof food_name !== "string" || !food_name.trim() || food_name.trim().length > 100) {
    return res.status(400).json({ message: "Food name is required and must be at most 100 characters" });
  }
  const price = parsePrice(current_price);
  if (price === null) return res.status(400).json({ message: "Current price must be a non-negative amount with at most two decimal places" });
  if (typeof isAvailable !== "boolean") return res.status(400).json({ message: "Availability must be a boolean" });

  try {
    const result = await pool.query(
      `INSERT INTO menu_items (food_name, current_price, is_available)
       VALUES ($1, $2, $3)
       RETURNING menu_item_id, food_name, current_price, is_available`,
      [food_name.trim(), price, isAvailable]
    );
    return res.status(201).json({ message: "Menu item added successfully", menu_item: result.rows[0] });
  } catch (error) {
    if (handleDuplicateFoodName(error, res)) return;
    console.error("Could not add menu item:", error.message);
    return res.status(500).json({ message: "Failed to add menu item" });
  }
});

router.put("/:id", async (req, res) => {
  if (!validMenuId(req.params.id)) {
    return res.status(400).json({ message: "Menu item ID must be a positive integer" });
  }
  if (!isObjectBody(req.body)) {
    return res.status(400).json({ message: "A menu item update object is required" });
  }
  const fields = ["food_name", "current_price", "is_available"];
  const provided = fields.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field));
  if (provided.length === 0) return res.status(400).json({ message: "Provide food_name, current_price, and/or is_available to update" });

  const values = [];
  const assignments = [];
  for (const field of provided) {
    let value = req.body[field];
    if (field === "food_name") {
      if (typeof value !== "string" || !value.trim() || value.trim().length > 100) {
        return res.status(400).json({ message: "Food name must be non-empty and at most 100 characters" });
      }
      value = value.trim();
    } else if (field === "current_price") {
      value = parsePrice(value);
      if (value === null) return res.status(400).json({ message: "Current price must be a non-negative amount with at most two decimal places" });
    } else if (typeof value !== "boolean") {
      return res.status(400).json({ message: "Availability must be a boolean" });
    }
    values.push(value);
    assignments.push(`${field} = $${values.length}`);
  }
  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE menu_items SET ${assignments.join(", ")} WHERE menu_item_id = $${values.length}
       RETURNING menu_item_id, food_name, current_price, is_available`,
      values
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Menu item not found" });
    return res.json({ message: "Menu item updated successfully", menu_item: result.rows[0] });
  } catch (error) {
    if (handleDuplicateFoodName(error, res)) return;
    console.error("Could not update menu item:", error.message);
    return res.status(500).json({ message: "Failed to update menu item" });
  }
});

router.delete("/:id", async (req, res) => {
  if (!validMenuId(req.params.id)) {
    return res.status(400).json({ message: "Menu item ID must be a positive integer" });
  }
  try {
    const result = await pool.query(
      "DELETE FROM menu_items WHERE menu_item_id = $1 RETURNING menu_item_id",
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Menu item not found" });
    return res.json({ message: "Menu item deleted successfully", menu_item_id: result.rows[0].menu_item_id });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({ message: "Menu item cannot be deleted while order items reference it" });
    }
    console.error("Could not delete menu item:", error.message);
    return res.status(500).json({ message: "Failed to delete menu item" });
  }
});

module.exports = router;
