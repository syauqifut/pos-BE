-- Create database (run this first)
-- CREATE DATABASE pos_db;

-- Connect to the pos_db database and create the users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'kasir')) DEFAULT 'kasir',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create an index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Insert a sample user (password is 'admin' hashed with bcrypt)
INSERT INTO users (name, username, password, role) 
VALUES (
    'Administrator',
    'admin', 
    '$2a$10$NA7OYwm5uydbf2g6KiC8KeizLNGcnoaqhmz76pxSunEQ8xS5wMXzG', 
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Setup Tables
-- ============================================

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Create manufacturers table
CREATE TABLE IF NOT EXISTS manufacturers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Create units table
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT,
    barcode TEXT,
    image_url TEXT,
    category_id INTEGER REFERENCES categories(id),
    manufacture_id INTEGER REFERENCES manufacturers(id),
    unit_id INTEGER REFERENCES units(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    CONSTRAINT unique_sku_active CHECK (sku IS NULL OR (is_active = FALSE OR sku IS NOT NULL)),
    CONSTRAINT unique_barcode_active CHECK (barcode IS NULL OR (is_active = FALSE OR barcode IS NOT NULL))
);

-- Create partial unique indexes for SKU and barcode (only for active products)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique ON products(sku) WHERE is_active = TRUE AND sku IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique ON products(barcode) WHERE is_active = TRUE AND barcode IS NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_manufacture_id ON products(manufacture_id);
CREATE INDEX IF NOT EXISTS idx_products_unit_id ON products(unit_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Trigger to automatically update updated_at for products
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance on existing tables
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_manufacturers_name ON manufacturers(name);
CREATE INDEX IF NOT EXISTS idx_units_name ON units(name); 