import { Pool, PoolClient } from 'pg';

export interface StockItem {
  product_id: number;
  product_name: string;
  sku?: string;
  barcode?: string;
  image_url?: string;
  category_name?: string;
  category_id?: number;
  manufacturer_name?: string;
  manufacturer_id?: number;
  stock: number;
  last_updated_at: Date;
  unit_id?: number;
  unit_name?: string;
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
  unit_id?: number;
  unit_name?: string;
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
      category_id: row.category_id,
      manufacturer_name: row.manufacturer_id ? row.manufacturer_name : null,
      manufacturer_id: row.manufacturer_id,
      stock: parseInt(row.stock) || 0,
      last_updated_at: row.last_updated_at,
      unit_id: row.unit_id || null,
      unit_name: row.unit_name || null
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
      last_updated_at: row.last_updated_at,
      unit_id: row.unit_id || null,
      unit_name: row.unit_name || null
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
        p.id AS product_id,
        p.name AS product_name,
        p.sku,
        p.barcode,
        p.image_url,
        c.id AS category_id,
        c.name AS category_name,
        m.id AS manufacturer_id,
        m.name AS manufacturer_name,
        COALESCE(SUM(
          s.qty * COALESCE(cs.to_unit_qty, 1) / COALESCE(ds.to_unit_qty, 1)
        ), 0) AS stock,
        MAX(s.created_at) AS last_updated_at,
        ds.to_unit_id AS unit_id,
        u.name AS unit_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacture_id = m.id
      LEFT JOIN stocks s ON p.id = s.product_id
      LEFT JOIN conversions cs 
        ON cs.product_id = s.product_id AND cs.to_unit_id = s.unit_id
      LEFT JOIN conversions ds 
        ON ds.product_id = p.id AND ds.is_default_sale = true
      LEFT JOIN units u ON u.id = ds.to_unit_id
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
        p.id AS product_id,
        p.name AS product_name,
        c.name AS category_name,
        m.name AS manufacturer_name,
        COALESCE(SUM(
          s.qty * COALESCE(cs.to_unit_qty, 1) / COALESCE(ds.to_unit_qty, 1)
        ), 0) AS stock,
        MAX(s.created_at) AS last_updated_at,
        ds.to_unit_id AS unit_id,
        u.name AS unit_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacture_id = m.id
      LEFT JOIN stocks s ON p.id = s.product_id
      LEFT JOIN conversions cs 
        ON cs.product_id = s.product_id AND cs.to_unit_id = s.unit_id
      LEFT JOIN conversions ds 
        ON ds.product_id = p.id AND ds.is_default_sale = true
      LEFT JOIN units u ON u.id = ds.to_unit_id
      WHERE p.id = $1
      GROUP BY p.id, p.name, c.name, m.name, ds.to_unit_id, u.name
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