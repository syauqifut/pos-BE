/**
 * SQL queries for product operations
 */

export const productQueries = {
  // Get all products with pagination, search, filter, and sort
  findAll: `
    SELECT 
      p.id,
      p.name,
      p.description,
      p.sku,
      p.barcode,
      p.image_url,
      p.is_active,
      p.created_at,
      p.updated_at,
      p.created_by,
      p.updated_by,
      c.id as category_id,
      c.name as category_name,
      u.id as unit_id,
      u.name as unit_name,
      m.id as manufacture_id,
      m.name as manufacture_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN units u ON p.unit_id = u.id
    LEFT JOIN manufacturers m ON p.manufacture_id = m.id
    WHERE p.is_active = true
  `,

  // Get product by ID with joins
  findById: `
    SELECT 
      p.id,
      p.name,
      p.description,
      p.sku,
      p.barcode,
      p.image_url,
      p.is_active,
      p.created_at,
      p.updated_at,
      p.created_by,
      p.updated_by,
      c.id as category_id,
      c.name as category_name,
      u.id as unit_id,
      u.name as unit_name,
      m.id as manufacture_id,
      m.name as manufacture_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN units u ON p.unit_id = u.id
    LEFT JOIN manufacturers m ON p.manufacture_id = m.id
    WHERE p.id = $1 AND p.is_active = true
  `,

  // Create new product
  create: `
    INSERT INTO products (
      name, 
      description, 
      sku, 
      barcode, 
      image_url, 
      category_id, 
      manufacture_id, 
      unit_id, 
      created_by, 
      updated_by
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
    RETURNING id
  `,

  // Update product
  update: `
    UPDATE products 
    SET 
      name = $2,
      description = $3,
      sku = $4,
      barcode = $5,
      image_url = $6,
      category_id = $7,
      manufacture_id = $8,
      unit_id = $9,
      updated_at = NOW(),
      updated_by = $10
    WHERE id = $1 AND is_active = true
    RETURNING id
  `,

  // Soft delete product
  softDelete: `
    UPDATE products 
    SET 
      is_active = false,
      updated_at = NOW(),
      updated_by = $2
    WHERE id = $1 AND is_active = true
    RETURNING id
  `,

  // Check SKU uniqueness (excluding current id for updates)
  checkSkuUniqueness: `
    SELECT id FROM products 
    WHERE sku = $1 AND is_active = true AND ($2::integer IS NULL OR id != $2)
  `,

  // Check barcode uniqueness (excluding current id for updates)
  checkBarcodeUniqueness: `
    SELECT id FROM products 
    WHERE barcode = $1 AND is_active = true AND ($2::integer IS NULL OR id != $2)
  `,

  // Count total for pagination
  countAll: `
    SELECT COUNT(*) as total
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN units u ON p.unit_id = u.id
    LEFT JOIN manufacturers m ON p.manufacture_id = m.id
    WHERE p.is_active = true
  `
}; 