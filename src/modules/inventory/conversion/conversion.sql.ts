/**
 * SQL queries for conversion operations
 */

export const conversionQueries = {
  // Check if conversion already exists
  checkDuplicate: `
    SELECT id 
    FROM conversions 
    WHERE product_id = $1 
      AND from_unit_id = $2 
      AND to_unit_id = $3 
      AND type = $4 
      AND is_active = true
  `,

  // Create a new conversion
  create: `
    INSERT INTO conversions (
      product_id, 
      from_unit_id, 
      to_unit_id, 
      to_unit_qty, 
      to_unit_price, 
      type, 
      is_default_purchase,
      is_default_sale,
      created_by
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
    RETURNING id, product_id, from_unit_id, to_unit_id, to_unit_qty, to_unit_price, type, is_default_purchase, is_default_sale, is_active, created_at, updated_at, created_by, updated_by
  `,

  // Create conversion log entry
  createLog: `
    INSERT INTO conversion_logs (
      conversion_id, 
      old_price, 
      new_price, 
      note, 
      created_by
    ) 
    VALUES ($1, $2, $3, $4, $5) 
    RETURNING *
  `,

  // Get conversion by ID
  findById: `
    SELECT 
      c.id,
      c.product_id,
      c.from_unit_id,
      c.to_unit_id,
      c.to_unit_qty,
      c.to_unit_price,
      c.type,
      c.is_default_purchase,
      c.is_default_sale,
      c.is_active,
      c.created_at,
      c.updated_at,
      c.created_by,
      c.updated_by,
      p.name as product_name,
      fu.name as from_unit_name,
      tu.name as to_unit_name
    FROM conversions c
    LEFT JOIN products p ON c.product_id = p.id
    LEFT JOIN units fu ON c.from_unit_id = fu.id
    LEFT JOIN units tu ON c.to_unit_id = tu.id
    WHERE c.id = $1 AND c.is_active = true
  `,

  // Check duplicate for update (excluding current record)
  checkDuplicateForUpdate: `
    SELECT id 
    FROM conversions 
    WHERE product_id = $1 
      AND from_unit_id = $2 
      AND to_unit_id = $3 
      AND type = $4 
      AND id != $5
      AND is_active = true
  `,

  // Update conversion
  update: `
    UPDATE conversions 
    SET 
      product_id = $2,
      from_unit_id = $3,
      to_unit_id = $4,
      to_unit_qty = $5,
      to_unit_price = $6,
      type = $7,
      is_default_purchase = $8,
      is_default_sale = $9,
      updated_by = $10,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND is_active = true
    RETURNING id, product_id, from_unit_id, to_unit_id, to_unit_qty, to_unit_price, type, is_default_purchase, is_default_sale, is_active, created_at, updated_at, created_by, updated_by
  `,

  // Close current active log
  closeCurrentLog: `
    UPDATE conversion_logs 
    SET valid_to = CURRENT_TIMESTAMP 
    WHERE conversion_id = $1 AND valid_to IS NULL
  `,

  // Get current price for a conversion
  getCurrentPrice: `
    SELECT to_unit_price 
    FROM conversions 
    WHERE id = $1
  `,

  // Get full product info
  getProductFullInfo: `
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
      m.id as manufacture_id,
      m.name as manufacture_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN manufacturers m ON p.manufacture_id = m.id
    WHERE p.id = $1 AND p.is_active = true
  `,

  // Get all conversions for a product
  getConversionsByProduct: `
    SELECT 
      c.id,
      c.to_unit_qty as qty,
      c.to_unit_price as price,
      c.type,
      c.is_default_purchase,
      c.is_default_sale,
      c.is_active,
      fu.name as from_unit,
      tu.name as to_unit
    FROM conversions c
    LEFT JOIN units fu ON c.from_unit_id = fu.id
    LEFT JOIN units tu ON c.to_unit_id = tu.id
    WHERE c.product_id = $1 AND c.is_active = true
    ORDER BY c.type, fu.name, tu.name
  `,

  // Get default purchase unit for a product
  getDefaultPurchaseUnit: `
    SELECT 
      c.to_unit_qty as qty,
      c.to_unit_price as price,
      tu.name as unit
    FROM conversions c
    LEFT JOIN units tu ON c.to_unit_id = tu.id
    WHERE c.product_id = $1 AND c.is_default_purchase = true AND c.is_active = true
    LIMIT 1
  `,

  // Get default sale unit for a product
  getDefaultSaleUnit: `
    SELECT 
      c.to_unit_qty as qty,
      c.to_unit_price as price,
      tu.name as unit
    FROM conversions c
    LEFT JOIN units tu ON c.to_unit_id = tu.id
    WHERE c.product_id = $1 AND c.is_default_sale = true AND c.is_active = true
    LIMIT 1
  `,

  // Clear existing default purchase for a product (before setting new one)
  clearDefaultPurchase: `
    UPDATE conversions 
    SET is_default_purchase = false
    WHERE product_id = $1 AND type = 'purchase' AND is_active = true
  `,

  // Clear existing default sale for a product (before setting new one)
  clearDefaultSale: `
    UPDATE conversions 
    SET is_default_sale = false
    WHERE product_id = $1 AND type = 'sale' AND is_active = true
  `,

  // Get conversion price history for a product
  getConversionPriceHistory: `
    SELECT 
      c.id as conversion_id,
      c.type,
      fu.name as from_unit,
      tu.name as to_unit,
      cl.old_price,
      cl.new_price,
      cl.note,
      cl.valid_from,
      cl.valid_to
    FROM conversions c
    INNER JOIN conversion_logs cl ON c.id = cl.conversion_id
    LEFT JOIN units fu ON c.from_unit_id = fu.id
    LEFT JOIN units tu ON c.to_unit_id = tu.id
    WHERE c.product_id = $1 AND c.is_active = true
    ORDER BY c.id, cl.valid_from ASC
  `
}; 