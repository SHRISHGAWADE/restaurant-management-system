
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const customerRoutes = require("./routes/customer");
const tableRoutes = require("./routes/tables");
const menuRoutes = require("./routes/menu");
const reservationRoutes = require("./routes/reservations");
const staffRoutes = require("./routes/staff");
const orderRoutes = require("./routes/orders");
const { paymentsRouter, orderPaymentRouter, billingRouter } = require("./routes/payments");
const reportsRoutes = require("./routes/reports");

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
}));

app.use(express.json());
app.use("/api/customers", customerRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api", orderPaymentRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/billing", billingRouter);
app.use("/api/reports", reportsRoutes);

// Test the connection to PostgreSQL.
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database"
    );

    res.json({
      status: "success",
      message: "Backend connected to PostgreSQL",
      database: result.rows[0].database
    });
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      message: "Database connection failed"
    });
  }
});

// Keep parser and otherwise-unhandled errors from falling through to Express's
// development error page, which can include stack traces in the response.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body must contain valid JSON" });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large" });
  }
  console.error("Unhandled request error:", error.type || error.name || "unknown");
  return res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
