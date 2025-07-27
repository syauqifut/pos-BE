import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { conversionQueries } from './conversion.sql';

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
  note?: string;
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
  note?: string;
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

export class ConversionService {
  /**
   * Create a new conversion record
   */
  async create(data: CreateConversionData): Promise<Conversion> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if conversion already exists
      const duplicateResult = await client.query(
        conversionQueries.checkDuplicate,
        [data.product_id, data.from_unit_id, data.to_unit_id, data.type]
      );

      if (duplicateResult.rows.length > 0) {
        throw new HttpException(409, 'Conversion with this combination already exists');
      }

      // Handle default flags - clear existing defaults if setting new ones
      if (data.is_default_purchase && data.type === 'purchase') {
        await client.query(conversionQueries.clearDefaultPurchase, [data.product_id]);
      }
      if (data.is_default_sale && data.type === 'sale') {
        await client.query(conversionQueries.clearDefaultSale, [data.product_id]);
      }

      // Create the conversion
      const conversionResult = await client.query(
        conversionQueries.create,
        [
          data.product_id,
          data.from_unit_id,
          data.to_unit_id,
          data.to_unit_qty,
          data.to_unit_price,
          data.type,
          data.is_default_purchase || false,
          data.is_default_sale || false,
          data.created_by
        ]
      );

      const conversion = conversionResult.rows[0];

      // Create initial conversion log
      await client.query(
        conversionQueries.createLog,
        [conversion.id, null, data.to_unit_price, data.note, data.created_by]
      );

      await client.query('COMMIT');
      return conversion;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing conversion
   */
  async update(id: number, data: UpdateConversionData): Promise<Conversion> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current conversion
      const currentResult = await client.query(conversionQueries.findById, [id]);
      if (currentResult.rows.length === 0) {
        throw new HttpException(404, 'Conversion not found');
      }

      const currentConversion = currentResult.rows[0];

      // Check for duplicate (excluding current record)
      const duplicateResult = await client.query(
        conversionQueries.checkDuplicateForUpdate,
        [data.product_id, data.from_unit_id, data.to_unit_id, data.type, id]
      );

      if (duplicateResult.rows.length > 0) {
        throw new HttpException(409, 'Conversion with this combination already exists');
      }

      // Check if price has changed
      const priceChanged = currentConversion.to_unit_price !== data.to_unit_price;

      // Handle default flags - clear existing defaults if setting new ones
      if (data.is_default_purchase && data.type === 'purchase') {
        await client.query(conversionQueries.clearDefaultPurchase, [data.product_id]);
      }
      if (data.is_default_sale && data.type === 'sale') {
        await client.query(conversionQueries.clearDefaultSale, [data.product_id]);
      }

      // Update the conversion
      const updateResult = await client.query(
        conversionQueries.update,
        [
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
        ]
      );

      if (updateResult.rows.length === 0) {
        throw new HttpException(404, 'Conversion not found or could not be updated');
      }

      // If price changed, handle conversion logs
      if (priceChanged) {
        // Close current active log
        await client.query(conversionQueries.closeCurrentLog, [id]);

        // Create new log entry
        await client.query(
          conversionQueries.createLog,
          [id, currentConversion.to_unit_price, data.to_unit_price, data.note, data.updated_by]
        );
      }

      await client.query('COMMIT');
      return updateResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get conversion by ID
   */
  async findById(id: number): Promise<Conversion> {
    const result = await pool.query(conversionQueries.findById, [id]);
    
    if (result.rows.length === 0) {
      throw new HttpException(404, 'Conversion not found');
    }

    return result.rows[0];
  }

  /**
   * Get detailed conversion information for a product
   */
  async getProductConversionDetail(productId: number): Promise<ProductConversionDetail> {
    try {
      // Get full product info
      const productResult = await pool.query(conversionQueries.getProductFullInfo, [productId]);
      
      if (productResult.rows.length === 0) {
        throw new HttpException(404, 'Product not found');
      }

      const productRow = productResult.rows[0];
      const product = {
        id: productRow.id,
        name: productRow.name,
        description: productRow.description,
        sku: productRow.sku,
        barcode: productRow.barcode,
        image_url: productRow.image_url,
        category: productRow.category_id ? {
          id: productRow.category_id,
          name: productRow.category_name
        } : null,
        manufacturer: productRow.manufacture_id ? {
          id: productRow.manufacture_id,
          name: productRow.manufacture_name
        } : null,
        is_active: productRow.is_active,
        created_at: productRow.created_at,
        updated_at: productRow.updated_at,
        created_by: productRow.created_by,
        updated_by: productRow.updated_by
      };

      // Get conversions for the product
      const conversionsResult = await pool.query(conversionQueries.getConversionsByProduct, [productId]);
      const conversions: ConversionDetail[] = conversionsResult.rows.map(row => ({
        id: row.id,
        from_unit: row.from_unit,
        to_unit: row.to_unit,
        qty: parseFloat(row.qty),
        price: parseFloat(row.price),
        type: row.type,
        is_active: row.is_active
      }));

      // Get default units
      const [defaultPurchaseResult, defaultSaleResult] = await Promise.all([
        pool.query(conversionQueries.getDefaultPurchaseUnit, [productId]),
        pool.query(conversionQueries.getDefaultSaleUnit, [productId])
      ]);

      const default_unit: { purchase?: DefaultUnit; sale?: DefaultUnit } = {};
      
      if (defaultPurchaseResult.rows.length > 0) {
        const row = defaultPurchaseResult.rows[0];
        default_unit.purchase = {
          unit: row.unit,
          qty: parseFloat(row.qty),
          price: parseFloat(row.price)
        };
      }

      if (defaultSaleResult.rows.length > 0) {
        const row = defaultSaleResult.rows[0];
        default_unit.sale = {
          unit: row.unit,
          qty: parseFloat(row.qty),
          price: parseFloat(row.price)
        };
      }

      // Get price history for all conversions of this product
      const historyResult = await pool.query(conversionQueries.getConversionPriceHistory, [productId]);
      
      // Group history by conversion_id
      const historyGrouped = new Map<number, ConversionPriceHistory>();
      
      historyResult.rows.forEach(row => {
        const conversionId = row.conversion_id;
        
        if (!historyGrouped.has(conversionId)) {
          historyGrouped.set(conversionId, {
            conversion_id: conversionId,
            from_unit: row.from_unit,
            to_unit: row.to_unit,
            type: row.type,
            history: []
          });
        }

        const historyItem: PriceHistoryItem = {
          old_price: row.old_price ? parseFloat(row.old_price) : undefined,
          new_price: parseFloat(row.new_price),
          note: row.note,
          valid_from: row.valid_from,
          valid_to: row.valid_to
        };

        historyGrouped.get(conversionId)!.history.push(historyItem);
      });

      const price_history = Array.from(historyGrouped.values());

      return {
        product,
        conversions,
        default_unit,
        price_history
      };

    } catch (error) {
      throw error;
    }
  }
} 