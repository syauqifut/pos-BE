import { Pool, PoolClient } from 'pg';

export interface StockItem {
  product_id: number;
  product_name: string;
  sku?: string;
  barcode?: string;
  image_url?: string;
  category_name?: string;
  manufacturer_name?: string;
  stock: number;
  last_updated_at: Date;
}

export interface StockTransaction {
  id: number;
  product_id: number;
  transaction_id?: number;
  type: 'sale' | 'purchase' | 'adjustment';
  qty: number;
  unit_id: number;
  description?: string;
  created_at: Date;
  created_by?: number;
}

export interface StockHistoryItem {
  id: number;
  product_id: number;
  transaction_id?: number;
  type: 'sale' | 'purchase' | 'adjustment';
  qty: number;
  description?: string;
  created_at: Date;
  created_by?: number;
  unit_name: string;
  created_by_name?: string;
}

export interface ProductStock {
  product_id: number;
  product_name: string;
  category_name?: string;
  manufacturer_name?: string;
  stock: number;
  last_updated_at?: Date;
}

export class StockRepository {
  /**
   * Transform raw query result to StockItem format
   */
  private static transformStockItem(row: any): StockItem {
    return {
      product_id: row.product_id,
      product_name: row.product_name,
      sku: row.sku,
      barcode: row.barcode,
      image_url: row.image_url,
      category_name: row.category_id ? row.category_name : null,
      manufacturer_name: row.manufacture_id ? row.manufacture_name : null,
      stock: parseInt(row.stock) || 0,
      last_updated_at: row.last_updated_at
    };
  }

  /**
   * Transform raw query result to ProductStock format
   */
  private static transformProductStock(row: any): ProductStock {
    return {
      product_id: row.product_id,
      product_name: row.product_name,
      category_name: row.category_name,
      manufacturer_name: row.manufacturer_name,
      stock: parseInt(row.stock) || 0,
      last_updated_at: row.last_updated_at
    };
  }

  /**
   * Transform raw query result to StockHistoryItem format
   */
  private static transformStockHistoryItem(row: any): StockHistoryItem {
    return {
      id: row.id,
      product_id: row.product_id,
      transaction_id: row.transaction_id,
      type: row.type,
      qty: row.qty,
      description: row.description,
      created_at: row.created_at,
      created_by: row.created_by,
      unit_name: row.unit_name,
      created_by_name: row.created_by_name
    };
  }

  /**
   * Get all stock information with search, filter, sort, and pagination
   */
  static async findAll(
    pool: Pool, 
    whereClause: string, 
    values: any[], 
    groupByClause: string, 
    orderClause: string, 
    limit: number, 
    offset: number
  ): Promise<StockItem[]> {
    const baseQuery = `
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
        COALESCE(SUM(s.qty), 0) as stock,
        MAX(s.created_at) as last_updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacture_id = m.id
      LEFT JOIN stocks s ON p.id = s.product_id
      WHERE ${whereClause}
    `;
    
    const finalQuery = `${baseQuery} ${groupByClause} ${orderClause} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    const result = await pool.query(finalQuery, [...values, limit, offset]);
    
    return result.rows.map(row => this.transformStockItem(row));
  }

  /**
   * Count total products for pagination
   */
  static async countAllProducts(pool: Pool, whereClause: string, values: any[]): Promise<number> {
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacture_id = m.id
      WHERE ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, values);
    return parseInt(countResult.rows[0].total);
  }

  /**
   * Get current stock for a specific product
   */
  static async getCurrentStockByProduct(pool: Pool, productId: number): Promise<ProductStock[]> {
    const query = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        c.name as category_name,
        m.name as manufacturer_name,
        COALESCE(SUM(s.qty), 0) as stock,
        MAX(s.created_at) as last_updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacture_id = m.id
      LEFT JOIN stocks s ON p.id = s.product_id
      WHERE p.id = $1
      GROUP BY p.id, p.name, c.name, m.name
    `;
    
    const result = await pool.query(query, [productId]);
    
    return result.rows.map(row => this.transformProductStock(row));
  }

  /**
   * Get stock history for a product with pagination
   */
  static async getStockHistory(
    pool: Pool, 
    productId: number, 
    limit: number, 
    offset: number
  ): Promise<StockHistoryItem[]> {
    const query = `
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
        usr.name as created_by_name
      FROM stocks s
      LEFT JOIN units u ON s.unit_id = u.id
      LEFT JOIN users usr ON s.created_by = usr.id
      WHERE s.product_id = $1
      ORDER BY s.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [productId, limit, offset]);
    
    return result.rows.map(row => this.transformStockHistoryItem(row));
  }

  /**
   * Count stock history for pagination
   */
  static async countStockHistory(pool: Pool, productId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as total
      FROM stocks
      WHERE product_id = $1
    `;
    
    const countResult = await pool.query(query, [productId]);
    return parseInt(countResult.rows[0].total);
  }
} 