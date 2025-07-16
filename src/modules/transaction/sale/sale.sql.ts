export const saleQueries = {
  // Generate next sale transaction number
  generateTransactionNo: `
    SELECT CONCAT('SAL-', TO_CHAR(CURRENT_DATE, 'YYYYMMDD'), '-', 
           LPAD((COUNT(*) + 1)::TEXT, 3, '0')) as transaction_no
    FROM transactions 
    WHERE type = 'sale' 
    AND DATE(created_at) = CURRENT_DATE
  `,

  // Create new sale transaction
  createTransaction: `
    INSERT INTO transactions (no, type, date, description, total_amount, paid_amount, payment_type, created_by)
    VALUES ($1, 'sale', $2, $3, $4, $5, $6, $7)
    RETURNING id, no, type, date, description, total_amount, paid_amount, payment_type, created_at, created_by
  `,

  // Create transaction item
  createTransactionItem: `
    INSERT INTO transaction_items (transaction_id, product_id, unit_id, qty, description)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, transaction_id, product_id, unit_id, qty, description
  `,

  // Create stock entry (negative for sales)
  createStock: `
    INSERT INTO stocks (product_id, transaction_id, type, qty, unit_id, description, created_by)
    VALUES ($1, $2, 'sale', $3, $4, $5, $6)
    RETURNING id
  `,

  // Get transaction with items by transaction ID
  getTransactionWithItems: `
    SELECT 
      t.id,
      t.no,
      t.type,
      t.date,
      t.description as transaction_description,
      t.total_amount,
      t.paid_amount,
      t.payment_type,
      t.created_at,
      t.created_by,
      u.name as created_by_name,
      ti.id as item_id,
      ti.product_id,
      ti.unit_id,
      ti.qty,
      ti.description as item_description,
      p.name as product_name,
      p.sku,
      p.barcode,
      un.name as unit_name
    FROM transactions t
    LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
    LEFT JOIN products p ON ti.product_id = p.id
    LEFT JOIN units un ON ti.unit_id = un.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.id = $1 AND t.type = 'sale'
    ORDER BY ti.id
  `,

  // Update existing transaction
  updateTransaction: `
    UPDATE transactions 
    SET date = $2, description = $3, total_amount = $4, paid_amount = $5, payment_type = $6, updated_by = $7, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND type = 'sale'
    RETURNING id, no, type, date, description, total_amount, paid_amount, payment_type, created_at, created_by, updated_at, updated_by
  `,

  // Get existing transaction items for reversal
  getExistingItems: `
    SELECT id, product_id, unit_id, qty, description
    FROM transaction_items
    WHERE transaction_id = $1
    ORDER BY id
  `,

  // Delete existing transaction items
  deleteTransactionItems: `
    DELETE FROM transaction_items
    WHERE transaction_id = $1
  `,

  // Create reversal stock entry
  createReversalStock: `
    INSERT INTO stocks (product_id, transaction_id, type, qty, unit_id, description, created_by)
    VALUES ($1, $2, 'sale', $3, $4, $5, $6)
    RETURNING id
  `,

  // Get conversion price for sales
  getConversionPrice: `
    SELECT to_unit_price
    FROM conversions
    WHERE product_id = $1 AND to_unit_id = $2 AND is_active = true AND type = 'sale'
    LIMIT 1
  `,

  // Get product name for response building
  getProductName: `
    SELECT name 
    FROM products 
    WHERE id = $1
  `,

  // Get unit name for response building
  getUnitName: `
    SELECT name 
    FROM units 
    WHERE id = $1
  `
}; 