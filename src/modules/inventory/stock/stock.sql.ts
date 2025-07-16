/**
 * SQL queries for stock operations
 */

export const stockQueries = {
  // Get aggregated stock information with search, filter, sort, and pagination
  findAllWithAggregation: `
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.sku,
      p.barcode,
      p.image_url,
      c.id as category_id,
      c.name as category_name,
      m.id as manufacture_id,
      m.name as manufacture_name,
      u.id as unit_id,
      u.name as unit_name,
      COALESCE(SUM(s.qty), 0) as stock_quantity
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN manufacturers m ON p.manufacture_id = m.id
    LEFT JOIN stocks s ON p.id = s.product_id
    LEFT JOIN units u ON s.unit_id = u.id
    WHERE p.is_active = true
  `,

  // Count total products for pagination
  countAllProducts: `
    SELECT COUNT(DISTINCT p.id) as total
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN manufacturers m ON p.manufacture_id = m.id
    LEFT JOIN stocks s ON p.id = s.product_id
    WHERE p.is_active = true
  `,

  // Get current stock for a specific product (helper query)
  getCurrentStockByProduct: `
    SELECT 
      p.id as product_id,
      p.name as product_name,
      u.id as unit_id,
      u.name as unit_name,
      COALESCE(SUM(s.qty), 0) as stock_quantity
    FROM products p
    LEFT JOIN stocks s ON p.id = s.product_id
    LEFT JOIN units u ON s.unit_id = u.id
    WHERE p.id = $1 AND p.is_active = true
    GROUP BY p.id, p.name, u.id, u.name
    ORDER BY u.name
  `,



  // Get stock transactions for a product (for audit/history)
  getStockHistory: `
    SELECT 
      s.id,
      s.product_id,
      s.transaction_id,
      s.type,
      s.qty,
      s.description,
      s.created_at,
      s.created_by,
      u.name as unit_name,
      creator.name as created_by_name
    FROM stocks s
    LEFT JOIN units u ON s.unit_id = u.id
    LEFT JOIN users creator ON s.created_by = creator.id
    WHERE s.product_id = $1
    ORDER BY s.created_at DESC
    LIMIT $2 OFFSET $3
  `,

  // Count stock history entries for pagination
  countStockHistory: `
    SELECT COUNT(*) as total
    FROM stocks s
    WHERE s.product_id = $1
  `
} as const; 