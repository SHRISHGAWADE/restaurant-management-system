-- 1. CUSTOMER
CREATE TABLE customers (
customer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
customer_name VARCHAR(100) NOT NULL,
email VARCHAR(255) UNIQUE,
phone_number VARCHAR(20),
address TEXT,
family_size SMALLINT CHECK (
family_size IS NULL OR family_size >= 1
)
);
-- 2. STAFF
CREATE TABLE staff (
staff_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
staff_name VARCHAR(100) NOT NULL,
role VARCHAR(40) NOT NULL,
date_of_birth DATE,
is_active BOOLEAN NOT NULL DEFAULT TRUE
);
-- 3. RESTAURANT TABLES
CREATE TABLE restaurant_tables (
table_number INT PRIMARY KEY,
capacity SMALLINT NOT NULL CHECK (capacity > 0),
status VARCHAR(20) NOT NULL DEFAULT 'available'
CHECK (status IN (
'available', 'occupied', 'maintenance'
))
);
-- 4. MENU ITEMS
CREATE TABLE menu_items (
menu_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
food_name VARCHAR(100) NOT NULL UNIQUE,
current_price NUMERIC(10,2) NOT NULL CHECK (
current_price >= 0
),
is_available BOOLEAN NOT NULL DEFAULT TRUE
);
-- 5. RESERVATIONS
CREATE TABLE reservations (
reservation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
customer_id BIGINT NOT NULL REFERENCES customers(customer_id),
table_number INT NOT NULL REFERENCES
restaurant_tables(table_number),
reservation_date DATE NOT NULL,
reservation_time TIME NOT NULL,
party_size SMALLINT NOT NULL CHECK (party_size > 0),
status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
CHECK (status IN (
'pending', 'confirmed', 'cancelled', 'completed'
)),
UNIQUE (table_number, reservation_date, reservation_time)
);
-- 6. ORDERS
CREATE TABLE orders (
order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
customer_id BIGINT NOT NULL REFERENCES customers(customer_id),
table_number INT NOT NULL REFERENCES
restaurant_tables(table_number),
accepted_by_staff_id BIGINT REFERENCES staff(staff_id),
created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
status VARCHAR(20) NOT NULL DEFAULT 'placed'
CHECK (status IN (
'placed', 'preparing', 'served',
'completed', 'cancelled'
))
);
-- 7. ORDER ITEMS
CREATE TABLE order_items (
order_id BIGINT NOT NULL REFERENCES
orders(order_id) ON DELETE CASCADE,
item_no SMALLINT NOT NULL,
menu_item_id BIGINT NOT NULL REFERENCES menu_items(menu_item_id),
quantity INT NOT NULL CHECK (quantity > 0),
unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
served_by_staff_id BIGINT REFERENCES staff(staff_id),
PRIMARY KEY (order_id, item_no)
);
-- 8. PAYMENTS
CREATE TABLE payments (
payment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
order_id BIGINT NOT NULL UNIQUE REFERENCES orders(order_id),
discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0
CHECK (discount_amount >= 0),
total_amount NUMERIC(10,2) NOT NULL
CHECK (total_amount >= 0),
payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
CHECK (payment_status IN (
'pending', 'paid', 'failed', 'refunded'
)),
payment_method VARCHAR(20)
CHECK (payment_method IN ('cash', 'card', 'UPI', 'other')),
paid_at TIMESTAMPTZ
);