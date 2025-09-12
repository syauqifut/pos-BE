import { Pool, PoolClient } from 'pg';

export interface Conversion {
  id: number;
  product_id: number;
  unit_id: number;
  unit_qty: number;
  unit_price: number;
  type: string;
  is_default: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: number;
  updated_by?: number;
  product_name?: string;
  unit_name?: string;
}

export interface ConversionLog {
  id: number;
  conversion_id: number;
  old_price?: number;
  new_price: number;
  note?: string;
  valid_from: Date;
  valid_to?: Date;
  created_at: Date;
  created_by?: number;
}

export interface CreateConversionData {
  product_id: number;
  unit_id: number;
  unit_qty: number;
  unit_price: number;
  type: string;
  is_default?: boolean;
  created_by?: number;
}

export interface UpdateConversionData {
  product_id: number;
  unit_id: number;
  unit_qty: number;
  unit_price: number;
  type: string;
  is_default?: boolean;
  updated_by?: number;
}

export interface ProductBasicInfo {
  id: number;
  name: string;
  image_url?: string;
  unit: {
    id: number;
    name: string;
  } | null;
}

export interface ConversionDetailByProduct {
  id: number;
  unit_id: number;
  unit_name: string;
  unit_qty: number;
  unit_price: number;
  type: string;
  is_default: boolean;
}

export interface ConversionDetail {
  id: number;
  unit: string;
  qty: number;
  price: number;
  type: string;
  is_active: boolean;
}

export interface PriceHistoryItem {
  old_price?: number;
  new_price: number;
  note?: string;
  valid_from: Date;
  valid_to?: Date;
}

export interface ConversionPriceHistory {
  conversion_id: number;
  unit: string;
  type: string;
  history: PriceHistoryItem[];
}

export interface DefaultUnit {
  unit: string;
  qty: number;
  price: number;
}

export interface ConversionItem {
  unit_name: string;
  unit_qty: number;
  unit_price: number;
  type: 'purchase' | 'sale';
  is_default: boolean;
}

export interface ProductConversionList {
  id: number;
  product_name: string;
  product_barcode?: string;
  conversions: ConversionItem[];
}

export interface FindAllConversionOptions {
  search?: string;
  sort_by?: 'product_name' | 'sale_unit_price' | 'purchase_unit_price';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ProductConversionDetail {
  product: {
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
  };
  conversions: ConversionDetail[];
  default_unit: {
    purchase?: DefaultUnit;
    sale?: DefaultUnit;
  };
  price_history: ConversionPriceHistory[];
}

export class ConversionRepository {
  /**
   * Build dynamic WHERE clause for search and filters
   */
  private static buildWhereClause(options: FindAllConversionOptions): { whereClause: string; values: any[] } {
    const conditions: string[] = ['p.is_active = true'];
    const values: any[] = [];
    let paramCount = 0;

    if (options.search) {
      paramCount++;
      conditions.push(`(p.name ILIKE $${paramCount} OR p.barcode ILIKE $${paramCount})`);
      values.push(`%${options.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values };
  }

  /**
   * Build ORDER BY clause for sorting
   */
  private static buildOrderClause(options: FindAllConversionOptions): string {
    const sortBy = options.sort_by || 'product_name';
    const sortOrder = options.sort_order || 'asc';

    let orderByField: string;
    switch (sortBy) {
      case 'sale_unit_price':
        orderByField = 'cs.unit_price';
        break;
      case 'purchase_unit_price':
        orderByField = 'cp.unit_price';
        break;
      case 'product_name':
      default:
        orderByField = 'p.name';
        break;
    }

    return `ORDER BY ${orderByField} ${sortOrder.toUpperCase()}`;
  }

  /**
   * Transform raw database row to Conversion object
   */
  private static transformConversion(row: any): ConversionDetailByProduct {
    return {
      id: row.id,
      unit_id: row.unit_id,
      unit_name: row.unit_name,
      unit_qty: row.unit_qty,
      unit_price: row.unit_price,
      type: row.type,
      is_default: row.is_default
    };
  }


  /**
   * Count total conversion records for pagination
   */
  static async countAll(pool: Pool, whereClause: string, values: any[]): Promise<number> {
    const query = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN conversions cs 
        ON p.id = cs.product_id 
        AND cs.type = 'sale' 
        AND cs.is_default = true
      LEFT JOIN units us 
        ON cs.unit_id = us.id
      LEFT JOIN conversions cp 
        ON p.id = cp.product_id 
        AND cp.type = 'purchase' 
        AND cp.is_default = true
      LEFT JOIN units up 
        ON cp.unit_id = up.id
      ${whereClause}
    `;
    
    const result = await pool.query(query, values);
    return parseInt(result.rows[0].total);
  }

  /**
   * Get all conversion records with pagination
   */
  static async findAll(pool: Pool, options: FindAllConversionOptions = {}): Promise<PaginatedResult<ProductConversionList>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    const { whereClause, values } = this.buildWhereClause(options);
    const orderClause = this.buildOrderClause(options);

    // Get total count for pagination
    const total = await this.countAll(pool, whereClause, values);

    // Get paginated product results
    const productQuery = `
      SELECT 
        p.id,
        p.name as product_name,
        p.barcode as product_barcode
      FROM products p
      ${whereClause}
      ${orderClause}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const productResult = await pool.query(productQuery, [...values, limit, offset]);
    
    if (productResult.rows.length === 0) {
      return {
        data: [],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

    // Get product IDs for conversion queries
    const productIds = productResult.rows.map(row => row.id);

    // Get all conversions for these products
    const conversionQuery = `
      WITH conversion_ranked AS (
        SELECT 
          c.product_id,
          c.unit_qty,
          c.unit_price,
          c.type,
          c.is_default,
          u.name as unit_name,
          ROW_NUMBER() OVER (PARTITION BY c.product_id, c.type ORDER BY c.unit_price ASC) as price_rank
        FROM conversions c
        JOIN units u ON c.unit_id = u.id
        WHERE c.product_id = ANY($1) 
          AND c.is_active = true
      )
      SELECT 
        product_id,
        unit_qty,
        unit_price,
        type,
        is_default,
        unit_name
      FROM conversion_ranked
      WHERE is_default = true 
         OR (type = 'sale' AND price_rank <= 2)
    `;

    const conversionResult = await pool.query(conversionQuery, [productIds]);
    
    // Group conversions by product_id
    const conversionsByProduct = new Map<number, ConversionItem[]>();
    
    conversionResult.rows.forEach(row => {
      if (!conversionsByProduct.has(row.product_id)) {
        conversionsByProduct.set(row.product_id, []);
      }
      
      conversionsByProduct.get(row.product_id)!.push({
        unit_name: row.unit_name,
        unit_qty: parseFloat(row.unit_qty),
        unit_price: parseFloat(row.unit_price),
        type: row.type,
        is_default: row.is_default
      });
    });

    // Build final data structure
    const data = productResult.rows.map(row => ({
      id: row.id,
      product_name: row.product_name,
      product_barcode: row.product_barcode,
      conversions: conversionsByProduct.get(row.id) || []
    }));

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get all conversion records (legacy method for backward compatibility)
   */
  static async findAllLegacy(pool: Pool): Promise<ProductConversionList[]> {
    // Get all products
    const productQuery = `
      SELECT 
        p.id,
        p.name as product_name,
        p.barcode as product_barcode
      FROM products p
      WHERE p.is_active = true
    `;
    
    const productResult = await pool.query(productQuery);
    
    if (productResult.rows.length === 0) {
      return [];
    }

    // Get product IDs
    const productIds = productResult.rows.map(row => row.id);

    // Get all conversions for these products
    const conversionQuery = `
      WITH conversion_ranked AS (
        SELECT 
          c.product_id,
          c.unit_qty,
          c.unit_price,
          c.type,
          c.is_default,
          u.name as unit_name,
          ROW_NUMBER() OVER (PARTITION BY c.product_id, c.type ORDER BY c.unit_price ASC) as price_rank
        FROM conversions c
        JOIN units u ON c.unit_id = u.id
        WHERE c.product_id = ANY($1) 
          AND c.is_active = true
      )
      SELECT 
        product_id,
        unit_qty,
        unit_price,
        type,
        is_default,
        unit_name
      FROM conversion_ranked
      WHERE is_default = true 
         OR (type = 'sale' AND price_rank <= 2)
    `;

    const conversionResult = await pool.query(conversionQuery, [productIds]);
    
    // Group conversions by product_id
    const conversionsByProduct = new Map<number, ConversionItem[]>();
    
    conversionResult.rows.forEach(row => {
      if (!conversionsByProduct.has(row.product_id)) {
        conversionsByProduct.set(row.product_id, []);
      }
      
      conversionsByProduct.get(row.product_id)!.push({
        unit_name: row.unit_name,
        unit_qty: parseFloat(row.unit_qty),
        unit_price: parseFloat(row.unit_price),
        type: row.type,
        is_default: row.is_default
      });
    });

    // Build final data structure
    return productResult.rows.map(row => ({
      id: row.id,
      product_name: row.product_name,
      product_barcode: row.product_barcode,
      conversions: conversionsByProduct.get(row.id) || []
    }));
  }

  /**
   * Check if conversion already exists
   */
  static async checkDuplicate(
    client: PoolClient, 
    productId: number, 
    unitId: number, 
    type: string
  ): Promise<boolean> {
    const query = `
      SELECT id FROM conversions 
      WHERE product_id = $1 AND unit_id = $2 AND type = $3 AND is_active = true
    `;
    
    const result = await client.query(query, [productId, unitId, type]);
    return result.rows.length > 0;
  }

  /**
   * Check if conversion already exists (for update)
   */
  static async checkDuplicateForUpdate(
    client: PoolClient, 
    productId: number, 
    unitId: number, 
    type: string, 
    excludeId: number
  ): Promise<boolean> {
    const query = `
      SELECT id FROM conversions 
      WHERE product_id = $1 AND unit_id = $2 AND type = $3 AND is_active = true AND id != $4
    `;
    
    const result = await client.query(query, [productId, unitId, type, excludeId]);
    return result.rows.length > 0;
  }

  /**
   * Clear default purchase flag for a product
   */
  static async clearDefault(client: PoolClient, productId: number, type: string): Promise<void> {
    const query = `
      UPDATE conversions 
      SET is_default = false 
      WHERE product_id = $1 AND type = $2
    `;
    
    await client.query(query, [productId, type]);
  }

  /**
   * Clear default sale flag for a product
   */

  /**
   * Create new conversion
   */
  static async create(client: PoolClient, data: CreateConversionData): Promise<Conversion> {
    const query = `
      INSERT INTO conversions (
        product_id, unit_id, unit_qty, unit_price, 
        type, is_default, created_by
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *
    `;
    
    const result = await client.query(query, [
      data.product_id,
      data.unit_id,
      data.unit_qty,
      data.unit_price,
      data.type,
      data.is_default || false,
      data.created_by
    ]);
    
    return result.rows[0];
  }

  /**
   * Create conversion log entry
   */
  static async createLog(
    client: PoolClient, 
    conversionId: number, 
    oldPrice: number | null, 
    newPrice: number, 
    note: string | null, 
    createdBy: number | null
  ): Promise<void> {
    const query = `
      INSERT INTO conversion_logs (
        conversion_id, old_price, new_price, note, valid_from, created_by
      ) 
      VALUES ($1, $2, $3, $4, NOW(), $5)
    `;
    
    await client.query(query, [conversionId, oldPrice, newPrice, note, createdBy]);
  }

  /**
   * Find conversion by ID
   */
  static async findById(pool: Pool, id: number): Promise<Conversion | null> {
    const query = `
      SELECT * FROM conversions WHERE id = $1 AND is_active = true
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Find conversion by ID
   */
  static async findConversionDetailById(pool: Pool, id: number): Promise<ConversionDetailByProduct | null> {
    const query = `
      SELECT 
        c.*,
        u.name as unit_name
      FROM conversions c
      JOIN units u ON c.unit_id = u.id
      WHERE c.id = $1 AND c.is_active = true
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? this.transformConversion(result.rows[0]) : null;
  }

  /**
   * Update conversion
   */
  static async update(client: PoolClient, id: number, data: UpdateConversionData): Promise<Conversion> {
    const query = `
      UPDATE conversions 
      SET 
        product_id = $2,
        unit_id = $3,
        unit_qty = $4,
        unit_price = $5,
        type = $6,
        is_default = $7,
        updated_at = NOW(),
        updated_by = $8
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;
    
    const result = await client.query(query, [
      id,
      data.product_id,
      data.unit_id,
      data.unit_qty,
      data.unit_price,
      data.type,
      data.is_default || false,
      data.updated_by
    ]);
    
    return result.rows[0];
  }

  /**
   * Delete conversion by ID
   */
  static async deleteById(pool: Pool, id: number): Promise<void> {
    const query = `UPDATE conversions SET is_active = false WHERE id = $1`;
    await pool.query(query, [id]);
  }

  /**
   * Close current active log
   */
  static async closeCurrentLog(client: PoolClient, conversionId: number): Promise<void> {
    const query = `
      UPDATE conversion_logs 
      SET valid_to = NOW() 
      WHERE conversion_id = $1 AND valid_to IS NULL
    `;
    
    await client.query(query, [conversionId]);
  }

  /**
   * Get full product info
   */
  static async getProductFullInfo(pool: Pool, productId: number): Promise<any> {
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
        m.id as manufacturer_id,
        m.name as manufacturer_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      WHERE p.id = $1 AND p.is_active = true
    `;
    
    const result = await pool.query(query, [productId]);
    return result.rows[0];
  }

  /**
   * Get product basic info
   */
  static async getProductBasicInfo(pool: Pool, productId: number): Promise<any> {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.sku,
        p.barcode,
        p.image_url,
        c.id as category_id,
        c.name as category_name,
        m.id as manufacturer_id,
        m.name as manufacturer_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      WHERE p.id = $1 AND p.is_active = true
    `;
    
    const result = await pool.query(query, [productId]);
    return result.rows[0];
  }

  /**
   * Get conversions by product and type
   */
  static async getConversionsByProductAndType(pool: Pool, productId: number, type: string): Promise<any[]> {
    const query = `
      SELECT 
        c.id,
        u.id as unit_id,
        u.name as unit,
        c.unit_qty as qty,
        c.unit_price as price,
        c.type,
        c.is_default,
        c.is_active
      FROM conversions c
      JOIN units u ON c.unit_id = u.id
      WHERE c.product_id = $1 AND c.type = $2 AND c.is_active = true
      ORDER BY c.unit_price
    `;
    
    const result = await pool.query(query, [productId, type]);
    return result.rows;
  }

  /**
   * Get conversions by product
   */
  static async getConversionsByProduct(pool: Pool, productId: number): Promise<ConversionDetail[]> {
    const query = `
      SELECT 
        c.id,
        u.name as unit,
        c.unit_qty as qty,
        c.unit_price as price,
        c.type,
        c.is_active
      FROM conversions c
      JOIN units u ON c.unit_id = u.id
      WHERE c.product_id = $1 AND c.is_active = true
      ORDER BY c.type, c.unit_price
    `;
    
    const result = await pool.query(query, [productId]);
    return result.rows;
  }

  /**
   * Get default purchase unit
   */
  static async getDefaultUnit(pool: Pool, productId: number, type: string): Promise<any> {
    const query = `
      SELECT 
        u.name as unit,
        c.unit_qty as qty,
        c.unit_price as price
      FROM conversions c
      JOIN units u ON c.unit_id = u.id
      WHERE c.product_id = $1 AND c.type = $2 AND c.is_default = true AND c.is_active = true
    `;
    
    const result = await pool.query(query, [productId, type]);
    return result.rows[0];
  }

  /**
   * Get default sale unit
   */

  /**
   * Get conversion price history
   */
  static async getConversionPriceHistory(pool: Pool, productId: number): Promise<any[]> {
    const query = `
      SELECT 
        cl.conversion_id,
        u.name as unit,
        c.type,
        cl.old_price,
        cl.new_price,
        cl.note,
        cl.valid_from,
        cl.valid_to
      FROM conversion_logs cl
      JOIN conversions c ON cl.conversion_id = c.id
      JOIN units u ON c.unit_id = u.id
      WHERE c.product_id = $1
      AND c.is_active = true
      ORDER BY cl.conversion_id, cl.valid_from DESC
    `;
    
    const result = await pool.query(query, [productId]);
    return result.rows;
  }

  /**
   * Check if product conversion is first time
   */
  static async findByProductIdAndType(pool: Pool, productId: number, type: string): Promise<Conversion[]> {
    const query = `
      SELECT * FROM conversions WHERE product_id = $1 AND type = $2 AND is_active = true
    `;

    const result = await pool.query(query, [productId, type]);
    return result.rows;
  }

  /**
   * Get default conversion by product ID
   */
  static async getDefaultConversionByProductId(pool: Pool, productId: number, type: string): Promise<any> {
    const query = `
      SELECT 
        u.id,
        u.name as unit
      FROM conversions c
      JOIN units u ON c.unit_id = u.id
      WHERE c.product_id = $1 AND c.type = $2 AND c.is_default = true
    `;
    
    const result = await pool.query(query, [productId, type]);
    return result.rows[0];
  }
} 