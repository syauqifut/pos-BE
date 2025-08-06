import { Pool, PoolClient } from 'pg';

export interface Product {
  id: number;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  image_url?: string;
  category?: {
    id: number;
    name: string;
  } | null;
  manufacturer?: {
    id: number;
    name: string;
  } | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: number;
  updated_by: number;
}

export interface CreateProductData {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  image_url?: string;
  category_id?: number;
  manufacturer_id?: number;
  created_by: number;
  updated_by: number;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  image_url?: string;
  category_id?: number;
  manufacturer_id?: number;
  updated_by: number;
}

export class ProductRepository {
  /**
   * Transform raw query result to Product format
   */
  private static transformProduct(row: any): Product {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      sku: row.sku,
      barcode: row.barcode,
      image_url: row.image_url,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name
      } : null,
      manufacturer: row.manufacture_id ? {
        id: row.manufacture_id,
        name: row.manufacture_name
      } : null,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by
    };
  }

  /**
   * Get all products with search, filter, sort, and pagination
   */
  static async findAll(
    pool: Pool, 
    whereClause: string, 
    values: any[], 
    orderClause: string, 
    limit: number, 
    offset: number
  ): Promise<Product[]> {
    const baseQuery = `
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
      WHERE ${whereClause}
    `;
    
    const finalQuery = `${baseQuery} ${orderClause} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    const result = await pool.query(finalQuery, [...values, limit, offset]);
    
    return result.rows.map(row => this.transformProduct(row));
  }

  /**
   * Count total products for pagination
   */
  static async countAll(pool: Pool, whereClause: string, values: any[]): Promise<number> {
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacture_id = m.id
      WHERE ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, values);
    return parseInt(countResult.rows[0].total);
  }

  /**
   * Get product by ID
   */
  static async findById(pool: Pool, id: number): Promise<Product | null> {
    const query = `
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
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? this.transformProduct(result.rows[0]) : null;
  }

  /**
   * Check SKU uniqueness
   */
  static async checkSkuUniqueness(pool: Pool, sku: string, excludeId?: number): Promise<boolean> {
    const query = `
      SELECT id FROM products 
      WHERE sku = $1 AND is_active = true AND ($2::integer IS NULL OR id != $2)
    `;
    
    const result = await pool.query(query, [sku, excludeId || null]);
    return result.rows.length === 0;
  }

  /**
   * Check barcode uniqueness
   */
  static async checkBarcodeUniqueness(pool: Pool, barcode: string, excludeId?: number): Promise<boolean> {
    const query = `
      SELECT id FROM products 
      WHERE barcode = $1 AND is_active = true AND ($2::integer IS NULL OR id != $2)
    `;
    
    const result = await pool.query(query, [barcode, excludeId || null]);
    return result.rows.length === 0;
  }

  /**
   * Create new product
   */
  static async create(pool: Pool, data: CreateProductData): Promise<number> {
    const query = `
      INSERT INTO products (
        name, 
        description, 
        sku, 
        barcode, 
        image_url, 
        category_id, 
        manufacture_id, 
        created_by, 
        updated_by
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING id
    `;
    
    const result = await pool.query(query, [
      data.name,
      data.description || null,
      data.sku || null,
      data.barcode || null,
      data.image_url || null,
      data.category_id || null,
      data.manufacturer_id || null,
      data.created_by,
      data.updated_by
    ]);
    
    return result.rows[0].id;
  }

  /**
   * Update product
   */
  static async update(pool: Pool, id: number, data: UpdateProductData): Promise<boolean> {
    const query = `
      UPDATE products 
      SET 
        name = $2,
        description = $3,
        sku = $4,
        barcode = $5,
        image_url = $6,
        category_id = $7,
        manufacture_id = $8,
        updated_at = NOW(),
        updated_by = $9
      WHERE id = $1 AND is_active = true
      RETURNING id
    `;
    
    const result = await pool.query(query, [
      id,
      data.name,
      data.description || null,
      data.sku || null,
      data.barcode || null,
      data.image_url || null,
      data.category_id || null,
      data.manufacturer_id || null,
      data.updated_by
    ]);
    
    return result.rows.length > 0;
  }

  /**
   * Soft delete product
   */
  static async softDelete(pool: Pool, id: number, updatedBy: number): Promise<boolean> {
    const query = `
      UPDATE products 
      SET 
        is_active = false,
        updated_at = NOW(),
        updated_by = $2
      WHERE id = $1 AND is_active = true
      RETURNING id
    `;
    
    const result = await pool.query(query, [id, updatedBy]);
    return result.rows.length > 0;
  }
} 