
-- =========================================================
-- RESTAURANT MANAGEMENT SYSTEM
-- File: seed.sql
-- Run after schema.sql on an empty database
-- =========================================================

-- 1. CUSTOMERS: 10 records
INSERT INTO customers
    (customer_name, email, phone_number, address, family_size)
VALUES
    ('Rahul Sharma', 'rahul@example.com', '9876500001', 'Mumbai', 4),
    ('Priya Patil', 'priya@example.com', '9876500002', 'Pune', 3),
    ('Aarav Mehta', 'aarav@example.com', '9876500003', 'Thane', 2),
    ('Sneha Joshi', 'sneha@example.com', '9876500004', 'Nashik', 5),
    ('Aditya Shah', 'aditya@example.com', '9876500005', 'Mumbai', 4),
    ('Ananya Desai', 'ananya@example.com', '9876500006', 'Pune', 6),
    ('Ishaan Kulkarni', 'ishaan@example.com', '9876500007', 'Nagpur', 2),
    ('Kavya Rao', 'kavya@example.com', '9876500008', 'Thane', 3),
    ('Rohan Nair', 'rohan@example.com', '9876500009', 'Mumbai', 4),
    ('Meera Khan', 'meera@example.com', '9876500010', 'Navi Mumbai', 2);

-- 2. STAFF: 8 records
INSERT INTO staff
    (staff_name, role, date_of_birth)
VALUES
    ('Aarya Deshmukh', 'Manager', '1990-04-15'),
    ('Rohan Patil', 'Chef', '1994-07-20'),
    ('Neha Shah', 'Server', '1998-01-12'),
    ('Kabir Joshi', 'Server', '1996-09-05'),
    ('Meera Nair', 'Cashier', '1995-03-18'),
    ('Arjun Kulkarni', 'Chef', '1992-11-22'),
    ('Sana Khan', 'Server', '1999-06-30'),
    ('Vikram Rao', 'Host', '1993-12-10');

-- 3. RESTAURANT TABLES: 8 records
INSERT INTO restaurant_tables
    (table_number, capacity, status)
VALUES
    (1, 2, 'available'),
    (2, 2, 'available'),
    (3, 4, 'occupied'),
    (4, 4, 'available'),
    (5, 4, 'available'),
    (6, 6, 'occupied'),
    (7, 6, 'available'),
    (8, 8, 'maintenance');

-- 4. MENU ITEMS: 10 records
INSERT INTO menu_items
    (food_name, current_price, is_available)
VALUES
    ('Paneer Tikka', 250.00, TRUE),
    ('Butter Chicken', 320.00, TRUE),
    ('Veg Biryani', 180.00, TRUE),
    ('Chicken Biryani', 220.00, TRUE),
    ('Masala Dosa', 120.00, TRUE),
    ('Tandoori Platter', 350.00, TRUE),
    ('Gulab Jamun', 90.00, TRUE),
    ('Fresh Lime Soda', 110.00, TRUE),
    ('Butter Naan Basket', 160.00, TRUE),
    ('Mango Lassi', 140.00, TRUE);

-- 5. RESERVATIONS: 12 records
-- Customer IDs are generated from 1 to 10 on a fresh database.
INSERT INTO reservations
    (customer_id, table_number, reservation_date,
     reservation_time, party_size, status)
VALUES
    (1, 1, CURRENT_DATE + 1, '18:00', 2, 'confirmed'),
    (2, 2, CURRENT_DATE + 1, '18:30', 2, 'confirmed'),
    (3, 3, CURRENT_DATE + 1, '19:00', 4, 'confirmed'),
    (4, 4, CURRENT_DATE + 2, '19:00', 3, 'confirmed'),
    (5, 5, CURRENT_DATE + 2, '19:30', 4, 'confirmed'),
    (6, 6, CURRENT_DATE + 3, '20:00', 5, 'confirmed'),
    (7, 7, CURRENT_DATE + 3, '18:00', 6, 'confirmed'),
    (8, 1, CURRENT_DATE + 4, '17:30', 2, 'pending'),
    (9, 2, CURRENT_DATE + 4, '18:30', 1, 'confirmed'),
    (10, 3, CURRENT_DATE - 1, '19:00', 3, 'completed'),
    (1, 4, CURRENT_DATE - 2, '20:00', 4, 'completed'),
    (2, 5, CURRENT_DATE + 5, '18:00', 2, 'cancelled');

-- 6. ORDERS: 12 records
-- Order IDs will be generated from 1 to 12 on a fresh database.
INSERT INTO orders
    (customer_id, table_number, accepted_by_staff_id,
     created_at, status)
VALUES
    (1, 1, 1, CURRENT_TIMESTAMP - INTERVAL '1 day', 'completed'),
    (2, 2, 2, CURRENT_TIMESTAMP - INTERVAL '1 day', 'completed'),
    (3, 3, 3, CURRENT_TIMESTAMP - INTERVAL '2 days', 'completed'),
    (4, 4, 4, CURRENT_TIMESTAMP - INTERVAL '3 days', 'completed'),
    (5, 5, 5, CURRENT_TIMESTAMP - INTERVAL '4 days', 'completed'),
    (6, 6, 6, CURRENT_TIMESTAMP - INTERVAL '5 days', 'completed'),
    (7, 7, 7, CURRENT_TIMESTAMP - INTERVAL '6 days', 'completed'),
    (8, 1, 1, CURRENT_TIMESTAMP - INTERVAL '7 days', 'completed'),
    (9, 2, 2, CURRENT_TIMESTAMP - INTERVAL '1 day', 'served'),
    (10, 3, 3, CURRENT_TIMESTAMP - INTERVAL '2 days', 'completed'),
    (1, 4, 4, CURRENT_TIMESTAMP - INTERVAL '3 days', 'served'),
    (2, 5, 5, CURRENT_TIMESTAMP - INTERVAL '4 days', 'completed');

-- 7. ORDER ITEMS: 24 records
-- Item prices are snapshots of the menu price at order time.
INSERT INTO order_items
    (order_id, item_no, menu_item_id, quantity,
     unit_price, served_by_staff_id)
VALUES
    (1, 1, 1, 2, 250.00, 1),
    (1, 2, 3, 1, 180.00, 1),

    (2, 1, 2, 1, 320.00, 2),
    (2, 2, 5, 2, 120.00, 2),

    (3, 1, 4, 2, 220.00, 3),
    (3, 2, 7, 1, 90.00, 3),

    (4, 1, 8, 3, 110.00, 4),
    (4, 2, 9, 1, 160.00, 4),

    (5, 1, 10, 2, 140.00, 5),
    (5, 2, 6, 1, 350.00, 5),

    (6, 1, 1, 1, 250.00, 6),
    (6, 2, 2, 1, 320.00, 6),

    (7, 1, 3, 2, 180.00, 7),
    (7, 2, 4, 1, 220.00, 7),

    (8, 1, 5, 1, 120.00, 1),
    (8, 2, 7, 2, 90.00, 1),

    (9, 1, 6, 1, 350.00, 2),
    (9, 2, 8, 1, 110.00, 2),

    (10, 1, 9, 2, 160.00, 3),
    (10, 2, 10, 1, 140.00, 3),

    (11, 1, 2, 1, 320.00, 4),
    (11, 2, 5, 1, 120.00, 4),

    (12, 1, 1, 2, 250.00, 5),
    (12, 2, 7, 1, 90.00, 5);

-- 8. PAYMENTS: 12 records
-- total_amount = item subtotal minus discount.
-- Non-paid records have paid_at = NULL.
INSERT INTO payments
    (order_id, discount_amount, total_amount,
     payment_status, payment_method, paid_at)
VALUES
    (1,   0.00, 680.00, 'paid',    'UPI',
        CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (2,  60.00, 500.00, 'paid',    'card',
        CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (3,  30.00, 500.00, 'paid',    'cash',
        CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (4,   0.00, 490.00, 'paid',    'UPI',
        CURRENT_TIMESTAMP - INTERVAL '3 days'),
    (5,  30.00, 600.00, 'paid',    'card',
        CURRENT_TIMESTAMP - INTERVAL '4 days'),
    (6,   0.00, 570.00, 'paid',    'cash',
        CURRENT_TIMESTAMP - INTERVAL '5 days'),
    (7,  80.00, 500.00, 'paid',    'UPI',
        CURRENT_TIMESTAMP - INTERVAL '6 days'),
    (8,   0.00, 300.00, 'paid',    'cash',
        CURRENT_TIMESTAMP - INTERVAL '7 days'),
    (9,  10.00, 450.00, 'pending', 'UPI', NULL),
    (10, 60.00, 400.00, 'paid',    'card',
        CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (11, 40.00, 400.00, 'failed',  'card', NULL),
    (12,  0.00, 590.00, 'paid',    'UPI',
        CURRENT_TIMESTAMP - INTERVAL '4 days');

-- End of seed data.
