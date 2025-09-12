import { Pool, PoolClient } from 'pg';

export interface SaleTransaction {
  id: number;
  no: string;
  type: string;
  date: string;
  description?: string;
  total_amount: number;
  paid_amount: number;
  payment_type: 'cash' | 'card' | 'transfer';
  change: number;
  created_at: Date;
  created_by: number;
  created_by_name?: string;
  items: SaleTransactionItem[];
}

export interface SaleTransactionItem {
  id: number;
  product_id: number;
  unit_id: number;
  qty: number;
  description?: string;
  product_name: string;
  sku?: string;
  barcode?: string;
  unit_name: string;
}

export interface CreateTransactionData {
  transactionNo: string;
  date: string;
  description?: string;
  totalAmount: number;
  totalPaid: number;
  paymentType: 'cash' | 'card' | 'transfer';
  userId: number;
}

export interface CreateTransactionItemData {
  transactionId: number;
  productId: number;
  unitId: number;
  qty: number;
  description: string;
}

export interface CreateStockData {
  productId: number;
  transactionId: number;
  qty: number;
  unitId: number;
  description: string;
  userId: number;
}

export interface UpdateTransactionData {
  transactionNo: string;
  date: string;
  description?: string;
  totalAmount: number;
  totalPaid: number;
  paymentType: 'cash' | 'card' | 'transfer';
  userId: number;
}

export class SaleRepository {
  /**
   * Generate next sale transaction number
   */
  static async generateTransactionNo(client: PoolClient): Promise<string> {
    const query = `
      SELECT CONCAT('SAL-', TO_CHAR(CURRENT_DATE, 'YYYYMMDD'), '-', 
             LPAD((COUNT(*) + 1)::TEXT, 3, '0')) as transaction_no
      FROM transactions 
      WHERE type = 'sale' 
      AND DATE(created_at) = CURRENT_DATE
    `;
    
    const result = await client.query(query);
    return result.rows[0].transaction_no;
  }

  /**
   * Create new sale transaction
   */
  static async createTransaction(client: PoolClient, data: CreateTransactionData): Promise<any> {
    const query = `
      INSERT INTO transactions (no, type, date, description, total_amount, paid_amount, payment_type, created_by)
      VALUES ($1, 'sale', $2, $3, $4, $5, $6, $7)
      RETURNING id, no, type, date, description, total_amount, paid_amount, payment_type, created_at, created_by
    `;
    
    const result = await client.query(query, [
      data.transactionNo,
      data.date,
      data.description || null,
      data.totalAmount,
      data.totalPaid,
      data.paymentType,
      data.userId
    ]);
    
    return result.rows[0];
  }

  /**
   * Create transaction item
   */
  static async createTransactionItem(client: PoolClient, data: CreateTransactionItemData): Promise<any> {
    const query = `
      INSERT INTO transaction_items (transaction_id, product_id, unit_id, qty, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, transaction_id, product_id, unit_id, qty, description
    `;
    
    const result = await client.query(query, [
      data.transactionId,
      data.productId,
      data.unitId,
      data.qty,
      data.description
    ]);
    
    return result.rows[0];
  }

  /**
   * Create stock entry (negative for sales)
   */
  static async createStock(client: PoolClient, data: CreateStockData): Promise<void> {
    const query = `
      INSERT INTO stocks (product_id, transaction_id, type, qty, unit_id, description, created_by)
      VALUES ($1, $2, 'sale', $3, $4, $5, $6)
      RETURNING id
    `;
    
    await client.query(query, [
      data.productId,
      data.transactionId,
      data.qty,
      data.unitId,
      data.description,
      data.userId
    ]);
  }

  /**
   * Get transaction with items by transaction ID
   */
  static async getTransactionWithItems(pool: Pool, transactionId: number): Promise<any[]> {
    const query = `
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
    `;
    
    const result = await pool.query(query, [transactionId]);
    return result.rows;
  }

  /**
   * Update existing transaction
   */
  static async updateTransaction(client: PoolClient, transactionId: number, data: UpdateTransactionData): Promise<any> {
    const query = `
      UPDATE transactions 
      SET date = $2, description = $3, total_amount = $4, paid_amount = $5, payment_type = $6, updated_by = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND type = 'sale'
      RETURNING id, no, type, date, description, total_amount, paid_amount, payment_type, created_at, created_by, updated_at, updated_by
    `;
    
    const result = await client.query(query, [
      transactionId,
      data.date,
      data.description || null,
      data.totalAmount,
      data.totalPaid,
      data.paymentType,
      data.userId
    ]);
    
    return result.rows[0];
  }

  /**
   * Get existing transaction items for reversal
   */
  static async getExistingItems(client: PoolClient, transactionId: number): Promise<any[]> {
    const query = `
      SELECT id, product_id, unit_id, qty, description
      FROM transaction_items
      WHERE transaction_id = $1
      ORDER BY id
    `;
    
    const result = await client.query(query, [transactionId]);
    return result.rows;
  }

  /**
   * Delete existing transaction items
   */
  static async deleteTransactionItems(client: PoolClient, transactionId: number): Promise<void> {
    const query = `
      DELETE FROM transaction_items
      WHERE transaction_id = $1
    `;
    
    await client.query(query, [transactionId]);
  }

  /**
   * Create reversal stock entry
   */
  static async createReversalStock(client: PoolClient, data: CreateStockData): Promise<void> {
    const query = `
      INSERT INTO stocks (product_id, transaction_id, type, qty, unit_id, description, created_by)
      VALUES ($1, $2, 'sale', $3, $4, $5, $6)
      RETURNING id
    `;
    
    await client.query(query, [
      data.productId,
      data.transactionId,
      data.qty,
      data.unitId,
      data.description,
      data.userId
    ]);
  }

  /**
   * Get conversion price for sales
   */
  static async getConversionPrice(client: PoolClient, productId: number, unitId: number): Promise<number> {
    const query = `
      SELECT unit_price
      FROM conversions
      WHERE product_id = $1 AND unit_id = $2 AND is_active = true AND type = 'sale'
      LIMIT 1
    `;
    
    const result = await client.query(query, [productId, unitId]);
    return result.rows.length > 0 ? parseFloat(result.rows[0].unit_price) : 0;
  }

  /**
   * Get product name for response building
   */
  static async getProductName(client: PoolClient, productId: number): Promise<string> {
    const query = `
      SELECT name 
      FROM products 
      WHERE id = $1
    `;
    
    const result = await client.query(query, [productId]);
    return result.rows[0]?.name || `Product ${productId}`;
  }

  /**
   * Get unit name for response building
   */
  static async getUnitName(client: PoolClient, unitId: number): Promise<string> {
    const query = `
      SELECT name 
      FROM units 
      WHERE id = $1
    `;
    
    const result = await client.query(query, [unitId]);
    return result.rows[0]?.name || `Unit ${unitId}`;
  }
} 