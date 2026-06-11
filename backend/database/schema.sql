-- Reset existing schema components if they exist (Clean Database Teardown)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS maintenance_logs CASCADE;
DROP TABLE IF EXISTS booking_items CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS asset_status CASCADE;
DROP TYPE IF EXISTS asset_condition CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS maintenance_status CASCADE;

-- Create native PostgreSQL custom enums
CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE asset_status AS ENUM ('active', 'maintenance', 'damaged');
CREATE TYPE asset_condition AS ENUM ('excellent', 'good', 'fair', 'poor', 'damaged');
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'rejected', 'issued', 'returned', 'overdue');
CREATE TYPE maintenance_status AS ENUM ('pending', 'in-progress', 'resolved');

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Assets Table
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'DSLR Cameras', 'Studio Lighting Equipment', 'Audio Systems', 
        'Costumes', 'Stage Props', 'Recording Equipment', 'Event Infrastructure'
    )),
    description TEXT,
    quantity_total INT NOT NULL CHECK (quantity_total >= 0),
    quantity_available INT NOT NULL CHECK (quantity_available >= 0),
    status asset_status DEFAULT 'active' NOT NULL,
    condition asset_condition DEFAULT 'excellent' NOT NULL,
    qr_code_base64 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bookings Table (Parent Request)
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    due_date DATE, -- Added for due date tracking/management
    purpose TEXT NOT NULL,
    status booking_status DEFAULT 'pending' NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_dates CHECK (start_date <= end_date)
);

-- 4. Booking Items Table (Child Table - Supports Multi-item bookings)
CREATE TABLE booking_items (
    id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    asset_id INT REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    issued_at TIMESTAMP WITH TIME ZONE,
    returned_at TIMESTAMP WITH TIME ZONE,
    return_condition asset_condition,
    UNIQUE (booking_id, asset_id)
);

-- 5. Maintenance Logs Table
CREATE TABLE maintenance_logs (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
    reported_by INT REFERENCES users(id) ON DELETE SET NULL,
    issue_description TEXT NOT NULL,
    status maintenance_status DEFAULT 'pending' NOT NULL,
    cost DECIMAL(10, 2) DEFAULT 0.00 CHECK (cost >= 0.00),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Notifications Table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Audit Logs Table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance and Index Optimization
CREATE INDEX idx_bookings_range ON bookings (start_date, end_date);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_booking_items_asset ON booking_items (asset_id);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id) WHERE is_read = FALSE;
CREATE INDEX idx_audit_logs_timestamp ON audit_logs (timestamp DESC);
