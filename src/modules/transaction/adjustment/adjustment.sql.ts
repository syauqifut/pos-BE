export const adjustmentQueries = {
  // Generate next adjustment transaction number
  generateTransactionNo: `
    SELECT CONCAT('ADJ-', TO_CHAR(CURRENT_DATE, 'YYYYMMDD'), '-', 
           LPAD((COUNT(*) + 1)::TEXT, 3, '0')) as transaction_no
    FROM transactions 
    WHERE type = 'adjustment' 
    AND DATE(created_at) = CURRENT_DATE
  `,

  // Create new adjustment transaction
  createTransaction: `
    INSERT INTO transactions (no, type, date, description, created_by)
    VALUES ($1, 'adjustment', $2, $3, $4)
    RETURNING id, no, type, date, description, created_at, created_by
  `,

  // Create transaction item
  createTransactionItem: `
    INSERT INTO transaction_items (transaction_id, product_id, unit_id, qty, description)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, transaction_id, product_id, unit_id, qty, description
  `,

  // Create stock entry
  createStock: `
    INSERT INTO stocks (product_id, transaction_id, type, qty, unit_id, description, created_by)
    VALUES ($1, $2, 'adjustment', $3, $4, $5, $6)
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
    WHERE t.id = $1 AND t.type = 'adjustment'
    ORDER BY ti.id
  `,

  // Update existing transaction
  updateTransaction: `
    UPDATE transactions 
    SET date = $2, description = $3, updated_by = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND type = 'adjustment'
    RETURNING id, no, type, date, description, created_at, created_by, updated_at, updated_by
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
    VALUES ($1, $2, 'adjustment', $3, $4, $5, $6)
    RETURNING id
  `,

  // Get product name for error messages
  getProductName: `
    SELECT name 
    FROM products 
    WHERE id = $1
  `,

  // Get unit name for error messages
  getUnitName: `
    SELECT name 
    FROM units 
    WHERE id = $1
  `
}; 