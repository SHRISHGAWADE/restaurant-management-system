
-- =========================================================
-- RESTAURANT MANAGEMENT SYSTEM
-- File: reports.sql
-- Run after schema.sql and seed.sql
-- =========================================================

-- REPORT 1: Display all customers
SELECT *
FROM customers
ORDER BY customer_id;


-- REPORT 2: Display all reservations with customer and table details
-- Demonstrates INNER JOIN
SELECT
    r.reservation_id,
    c.customer_name,
    c.phone_number,
    r.table_number,
    t.capacity,
    r.reservation_date,
    r.reservation_time,
    r.party_size,
    r.status
FROM reservations r
INNER JOIN customers c
    ON r.customer_id = c.customer_id
INNER JOIN restaurant_tables t
    ON r.table_number = t.table_number
ORDER BY r.reservation_date, r.reservation_time;


-- REPORT 3: Upcoming reservations that have not been cancelled
-- Demonstrates WHERE and ORDER BY
SELECT
    reservation_id,
    customer_id,
    table_number,
    reservation_date,
    reservation_time,
    party_size,
    status
FROM reservations
WHERE reservation_date >= CURRENT_DATE
  AND status IN ('pending', 'confirmed')
ORDER BY reservation_date, reservation_time;


-- REPORT 4: Calculate the bill for every order
-- Uses the view created in schema.sql
SELECT
    o.order_id,
    c.customer_name,
    o.table_number,
    o.created_at,
    o.status AS order_status,
    COALESCE(b.bill_amount, 0) AS bill_amount,
    COALESCE(p.discount_amount, 0) AS discount_amount,
    p.total_amount AS recorded_payment_amount,
    p.payment_status
FROM orders o
JOIN customers c
    ON o.customer_id = c.customer_id
LEFT JOIN (
    SELECT
        order_id,
        SUM(quantity * unit_price) AS bill_amount
    FROM order_items
    GROUP BY order_id
) b
    ON o.order_id = b.order_id
LEFT JOIN payments p
    ON o.order_id = p.order_id
ORDER BY o.order_id;


-- REPORT 5: Daily revenue from successful payments
-- Demonstrates SUM, COUNT and GROUP BY
SELECT
    DATE(paid_at) AS revenue_date,
    COUNT(*) AS successful_payments,
    SUM(total_amount) AS total_revenue
FROM payments
WHERE payment_status = 'paid'
  AND paid_at IS NOT NULL
GROUP BY DATE(paid_at)
ORDER BY revenue_date DESC;


-- REPORT 6: Most popular menu items
-- Demonstrates JOIN, SUM, GROUP BY and HAVING
SELECT
    m.menu_item_id,
    m.food_name,
    SUM(oi.quantity) AS quantity_sold,
    SUM(oi.quantity * oi.unit_price) AS item_sales_value
FROM order_items oi
JOIN menu_items m
    ON oi.menu_item_id = m.menu_item_id
JOIN orders o
    ON oi.order_id = o.order_id
WHERE o.status <> 'cancelled'
GROUP BY m.menu_item_id, m.food_name
HAVING SUM(oi.quantity) >= 2
ORDER BY quantity_sold DESC, m.food_name;


-- REPORT 7: Number of orders handled by each staff member
-- Demonstrates LEFT JOIN and COUNT
SELECT
    s.staff_id,
    s.staff_name,
    s.role,
    COUNT(o.order_id) AS orders_handled
FROM staff s
LEFT JOIN orders o
    ON s.staff_id = o.accepted_by_staff_id
GROUP BY s.staff_id, s.staff_name, s.role
ORDER BY orders_handled DESC, s.staff_name;


-- REPORT 8: Customers who have placed more than one order
-- Demonstrates HAVING with COUNT
SELECT
    c.customer_id,
    c.customer_name,
    COUNT(o.order_id) AS total_orders
FROM customers c
JOIN orders o
    ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.customer_name
HAVING COUNT(o.order_id) > 1
ORDER BY total_orders DESC;


-- REPORT 9: Customers who have never made a reservation
-- Demonstrates a correlated subquery with NOT EXISTS
SELECT
    c.customer_id,
    c.customer_name,
    c.email
FROM customers c
WHERE NOT EXISTS (
    SELECT 1
    FROM reservations r
    WHERE r.customer_id = c.customer_id
)
ORDER BY c.customer_name;


-- REPORT 10: Menu items that have never been ordered
-- Demonstrates a subquery with NOT EXISTS
SELECT
    m.menu_item_id,
    m.food_name,
    m.current_price
FROM menu_items m
WHERE NOT EXISTS (
    SELECT 1
    FROM order_items oi
    WHERE oi.menu_item_id = m.menu_item_id
)
ORDER BY m.food_name;


-- REPORT 11: Count orders by their status
-- Demonstrates GROUP BY and COUNT
SELECT
    status,
    COUNT(*) AS total_orders
FROM orders
GROUP BY status
ORDER BY total_orders DESC;


-- REPORT 12: Find pending and failed payments
-- Demonstrates WHERE and sorting
SELECT
    p.payment_id,
    p.order_id,
    c.customer_name,
    p.total_amount,
    p.payment_method,
    p.payment_status
FROM payments p
JOIN orders o
    ON p.order_id = o.order_id
JOIN customers c
    ON o.customer_id = c.customer_id
WHERE p.payment_status IN ('pending', 'failed')
ORDER BY p.payment_status, p.payment_id;


-- REPORT 13: Find tables with a capacity of four or more
SELECT
    table_number,
    capacity,
    status
FROM restaurant_tables
WHERE capacity >= 4
ORDER BY capacity DESC, table_number;


-- REPORT 14: Display staff age calculated from date of birth
-- Age is calculated instead of being stored as a static value
SELECT
    staff_id,
    staff_name,
    role,
    date_of_birth,
    EXTRACT(YEAR FROM AGE(date_of_birth)) AS age
FROM staff
WHERE date_of_birth IS NOT NULL
ORDER BY age DESC;


-- End of reports.sql
