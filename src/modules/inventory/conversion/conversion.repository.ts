import { Pool, PoolClient } from 'pg';

export interface Conversion {
  id: number;
  product_id: number;
  from_unit_id: number;
  to_unit_id: number;
  to_unit_qty: number;
  to_unit_price: number;
  type: string;
  is_default_purchase: boolean;
  is_default_sale: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: number;
  updated_by?: number;
  product_name?: string;
  from_unit_name?: string;
  to_unit_name?: string;
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
  from_unit_id: number;
  to_unit_id: number;
  to_unit_qty: number;
  to_unit_price: number;
  type: string;
  is_default_purchase?: boolean;
  is_default_sale?: boolean;
  created_by?: number;
}

export interface UpdateConversionData {
  product_id: number;
  from_unit_id: number;
  to_unit_id: number;
  to_unit_qty: number;
  to_unit_price: number;
  type: string;
  is_default_purchase?: boolean;
  is_default_sale?: boolean;
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
  from_unit_id: number;
  to_unit_id: number;
  from_unit_name: string;
  to_unit_name: string;
  to_unit_qty: number;
  to_unit_price: number;
  type: string;
  is_default: boolean;
}

export interface ConversionDetail {
  id: number;
  from_unit: string;
  to_unit: string;
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
  from_unit: string;
  to_unit: string;
  type: string;
  history: PriceHistoryItem[];
}

export interface DefaultUnit {
  unit: string;
  qty: number;
  price: number;
}

export interface ProductConversionList {
  id: number;
  product_name: string;
  product_barcode?: string;
  sale_unit_id?: number;
  sale_unit_qty?: number;
  sale_unit_price?: number;
  sale_unit_name?: string;
  purchase_unit_id?: number;
  purchase_unit_qty?: number;
  purchase_unit_price?: number;
  purchase_unit_name?: string;
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
   * Transform raw database row to Conversion object
   */
  private static transformConversion(row: any): ConversionDetailByProduct {
    let is_default = false;
    if (row.type === 'purchase') {
      is_default = row.is_default_purchase;
    } else if (row.type === 'sale') {
      is_default = row.is_default_sale;
    }

    return {
      id: row.id,
      from_unit_id: row.from_unit_id,
      to_unit_id: row.to_unit_id,
      from_unit_name: row.from_unit_name,
      to_unit_name: row.to_unit_name,
      to_unit_qty: row.to_unit_qty,
      to_unit_price: row.to_unit_price,
      type: row.type,
      is_default: is_default
    };
  }

  /**
   * Transform raw database row to ConversionList object
   */
  private static transformProductConversionList(row: any): ProductConversionList {
    return {
      id: row.id,
      product_name: row.product_name,
      product_barcode: row.product_barcode,
      sale_unit_name: row.sale_unit_name,
      sale_unit_qty: row.sale_unit_qty,
      sale_unit_price: row.sale_unit_price,
      purchase_unit_name: row.purchase_unit_name,
      purchase_unit_qty: row.purchase_unit_qty,
      purchase_unit_price: row.purchase_unit_price
    };
  }

  /**
   * Get all conversion records
   */
  static async findAll(pool: Pool): Promise<ProductConversionList[]> {
    const query = `
      SELECT 
        p.id,
        p.name as product_name,
        p.barcode as product_barcode,
        cs.to_unit_qty as sale_unit_qty,
        cs.to_unit_price as sale_unit_price,
        us.name as sale_unit_name,
        cp.to_unit_qty as purchase_unit_qty,
        cp.to_unit_price as purchase_unit_price,
        up.name as purchase_unit_name
      FROM products p
      LEFT JOIN conversions cs 
        ON p.id = cs.product_id 
        AND cs.type = 'sale' 
        AND cs.is_default_sale = true
      LEFT JOIN units us 
        ON cs.to_unit_id = us.id
      LEFT JOIN conversions cp 
        ON p.id = cp.product_id 
        AND cp.type = 'purchase' 
        AND cp.is_default_purchase = true
      LEFT JOIN units up 
        ON cp.to_unit_id = up.id
      WHERE p.is_active = true
    `;
    const result = await pool.query(query);
    return result.rows.map(row => this.transformProductConversionList(row));
  }

  /**
   * Check if conversion already exists
   */
  static async checkDuplicate(
    client: PoolClient, 
    productId: number, 
    fromUnitId: number, 
    toUnitId: number, 
    type: string
  ): Promise<boolean> {
    const query = `
      SELECT id FROM conversions 
      WHERE product_id = $1 AND from_unit_id = $2 AND to_unit_id = $3 AND type = $4 AND is_active = true
    `;
    
    const result = await client.query(query, [productId, fromUnitId, toUnitId, type]);
    return result.rows.length > 0;
  }

  /**
   * Check if conversion already exists (for update)
   */
  static async checkDuplicateForUpdate(
    client: PoolClient, 
    productId: number, 
    fromUnitId: number, 
    toUnitId: number, 
    type: string, 
    excludeId: number
  ): Promise<boolean> {
    const query = `
      SELECT id FROM conversions 
      WHERE product_id = $1 AND from_unit_id = $2 AND to_unit_id = $3 AND type = $4 AND is_active = true AND id != $5
    `;
    
    const result = await client.query(query, [productId, fromUnitId, toUnitId, type, excludeId]);
    return result.rows.length > 0;
  }

  /**
   * Clear default purchase flag for a product
   */
  static async clearDefaultPurchase(client: PoolClient, productId: number): Promise<void> {
    const query = `
      UPDATE conversions 
      SET is_default_purchase = false 
      WHERE product_id = $1 AND type = 'purchase'
    `;
    
    await client.query(query, [productId]);
  }

  /**
   * Clear default sale flag for a product
   */
  static async clearDefaultSale(client: PoolClient, productId: number): Promise<void> {
    const query = `
      UPDATE conversions 
      SET is_default_sale = false 
      WHERE product_id = $1 AND type = 'sale'
    `;
    
    await client.query(query, [productId]);
  }

  /**
   * Create new conversion
   */
  static async create(client: PoolClient, data: CreateConversionData): Promise<Conversion> {
    const query = `
      INSERT INTO conversions (
        product_id, from_unit_id, to_unit_id, to_unit_qty, to_unit_price, 
        type, is_default_purchase, is_default_sale, created_by
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *
    `;
    
    const result = await client.query(query, [
      data.product_id,
      data.from_unit_id,
      data.to_unit_id,
      data.to_unit_qty,
      data.to_unit_price,
      data.type,
      data.is_default_purchase || false,
      data.is_default_sale || false,
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
        uf.name as from_unit_name,
        ut.name as to_unit_name
      FROM conversions c
      JOIN units uf ON c.from_unit_id = uf.id
      JOIN units ut ON c.to_unit_id = ut.id
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
        from_unit_id = $3,
        to_unit_id = $4,
        to_unit_qty = $5,
        to_unit_price = $6,
        type = $7,
        is_default_purchase = $8,
        is_default_sale = $9,
        updated_at = NOW(),
        updated_by = $10
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;
    
    const result = await client.query(query, [
      id,
      data.product_id,
      data.from_unit_id,
      data.to_unit_id,
      data.to_unit_qty,
      data.to_unit_price,
      data.type,
      data.is_default_purchase || false,
      data.is_default_sale || false,
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
        m.id as manufacture_id,
        m.name as manufacture_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacture_id = m.id
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
        m.id as manufacture_id,
        m.name as manufacture_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacture_id = m.id
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
        fu.name as from_unit,
        tu.name as to_unit,
        c.to_unit_qty as qty,
        c.to_unit_price as price,
        c.type,
        c.is_default_purchase,
        c.is_default_sale,
        c.is_active
      FROM conversions c
      JOIN units fu ON c.from_unit_id = fu.id
      JOIN units tu ON c.to_unit_id = tu.id
      WHERE c.product_id = $1 AND c.type = $2 AND c.is_active = true
      ORDER BY c.to_unit_price
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
        fu.name as from_unit,
        tu.name as to_unit,
        c.to_unit_qty as qty,
        c.to_unit_price as price,
        c.type,
        c.is_active
      FROM conversions c
      JOIN units fu ON c.from_unit_id = fu.id
      JOIN units tu ON c.to_unit_id = tu.id
      WHERE c.product_id = $1 AND c.is_active = true
      ORDER BY c.type, c.to_unit_price
    `;
    
    const result = await pool.query(query, [productId]);
    return result.rows;
  }

  /**
   * Get default purchase unit
   */
  static async getDefaultPurchaseUnit(pool: Pool, productId: number): Promise<any> {
    const query = `
      SELECT 
        tu.name as unit,
        c.to_unit_qty as qty,
        c.to_unit_price as price
      FROM conversions c
      JOIN units tu ON c.to_unit_id = tu.id
      WHERE c.product_id = $1 AND c.type = 'purchase' AND c.is_default_purchase = true AND c.is_active = true
    `;
    
    const result = await pool.query(query, [productId]);
    return result.rows[0];
  }

  /**
   * Get default sale unit
   */
  static async getDefaultSaleUnit(pool: Pool, productId: number): Promise<any> {
    const query = `
      SELECT 
        tu.name as unit,
        c.to_unit_qty as qty,
        c.to_unit_price as price
      FROM conversions c
      JOIN units tu ON c.to_unit_id = tu.id
      WHERE c.product_id = $1 AND c.type = 'sale' AND c.is_default_sale = true AND c.is_active = true
    `;
    
    const result = await pool.query(query, [productId]);
    return result.rows[0];
  }

  /**
   * Get conversion price history
   */
  static async getConversionPriceHistory(pool: Pool, productId: number): Promise<any[]> {
    const query = `
      SELECT 
        cl.conversion_id,
        fu.name as from_unit,
        tu.name as to_unit,
        c.type,
        cl.old_price,
        cl.new_price,
        cl.note,
        cl.valid_from,
        cl.valid_to
      FROM conversion_logs cl
      JOIN conversions c ON cl.conversion_id = c.id
      JOIN units fu ON c.from_unit_id = fu.id
      JOIN units tu ON c.to_unit_id = tu.id
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
} 