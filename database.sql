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

-- ============================================
-- Inventory Tables
-- ============================================

-- Create conversions table
CREATE TABLE IF NOT EXISTS conversions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  from_unit_id INTEGER NOT NULL REFERENCES units(id),
  to_unit_id INTEGER NOT NULL REFERENCES units(id),
  to_unit_qty NUMERIC NOT NULL,
  to_unit_price NUMERIC NOT NULL,
  type VARCHAR(50) NOT NULL, -- e.g. 'purchase' or 'sale'
  is_default_purchase BOOLEAN DEFAULT FALSE,
  is_default_sale BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by INTEGER,
  updated_by INTEGER,
  UNIQUE (product_id, from_unit_id, to_unit_id, type),
  CONSTRAINT chk_default_purchase_type CHECK (NOT is_default_purchase OR type = 'purchase'),
  CONSTRAINT chk_default_sale_type CHECK (NOT is_default_sale OR type = 'sale')
);

-- Create conversion_logs table
CREATE TABLE IF NOT EXISTS conversion_logs (
  id SERIAL PRIMARY KEY,
  conversion_id INTEGER NOT NULL REFERENCES conversions(id),
  old_price NUMERIC,
  new_price NUMERIC NOT NULL,
  note TEXT,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by INTEGER
);

-- Create indexes for better performance on conversions
CREATE INDEX IF NOT EXISTS idx_conversions_product_id ON conversions(product_id);
CREATE INDEX IF NOT EXISTS idx_conversions_from_unit_id ON conversions(from_unit_id);
CREATE INDEX IF NOT EXISTS idx_conversions_to_unit_id ON conversions(to_unit_id);
CREATE INDEX IF NOT EXISTS idx_conversions_type ON conversions(type);
CREATE INDEX IF NOT EXISTS idx_conversions_is_active ON conversions(is_active);
CREATE INDEX IF NOT EXISTS idx_conversions_is_default_purchase ON conversions(is_default_purchase);
CREATE INDEX IF NOT EXISTS idx_conversions_is_default_sale ON conversions(is_default_sale);

-- Create unique indexes to ensure only one default per product per type
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversions_default_purchase ON conversions(product_id) WHERE is_default_purchase = TRUE AND is_active = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversions_default_sale ON conversions(product_id) WHERE is_default_sale = TRUE AND is_active = TRUE;

-- Create indexes for better performance on conversion_logs
CREATE INDEX IF NOT EXISTS idx_conversion_logs_conversion_id ON conversion_logs(conversion_id);
CREATE INDEX IF NOT EXISTS idx_conversion_logs_valid_from ON conversion_logs(valid_from);
CREATE INDEX IF NOT EXISTS idx_conversion_logs_valid_to ON conversion_logs(valid_to);

-- ============================================
-- Stock Management Tables
-- ============================================

-- Create stocks table
CREATE TABLE IF NOT EXISTS stocks (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  transaction_id INTEGER, -- optional, FK to transactions if available
  type VARCHAR(20) NOT NULL CHECK (type IN ('sale', 'purchase', 'adjustment')),
  qty INTEGER NOT NULL, -- positive or negative depending on type
  unit_id INTEGER NOT NULL REFERENCES units(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- Create indexes for better performance on stocks
CREATE INDEX IF NOT EXISTS idx_stocks_product_id ON stocks(product_id);
CREATE INDEX IF NOT EXISTS idx_stocks_unit_id ON stocks(unit_id);
CREATE INDEX IF NOT EXISTS idx_stocks_type ON stocks(type);
CREATE INDEX IF NOT EXISTS idx_stocks_created_at ON stocks(created_at);
CREATE INDEX IF NOT EXISTS idx_stocks_created_by ON stocks(created_by);
CREATE INDEX IF NOT EXISTS idx_stocks_transaction_id ON stocks(transaction_id);

-- Trigger to automatically update updated_at for conversions
CREATE TRIGGER update_conversions_updated_at 
    BEFORE UPDATE ON conversions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 