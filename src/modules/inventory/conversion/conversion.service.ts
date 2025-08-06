import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { ConversionRepository, Conversion, CreateConversionData, UpdateConversionData, ProductConversionDetail, DefaultUnit, PriceHistoryItem, ConversionPriceHistory, ProductConversionList, ConversionDetailByProduct } from './conversion.repository';

export interface CreateConversionRequest {
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

export interface UpdateConversionRequest {
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

export interface ProductConversionByType {
  id: number;
  from_unit: string;
  to_unit: string;
  qty: number;
  price: number;
  is_default: boolean;
  is_active: boolean;
}

export class ConversionService {
  /**
   * Create a new conversion record
   */
  async create(data: CreateConversionRequest): Promise<Conversion> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if conversion already exists
      const duplicateExists = await ConversionRepository.checkDuplicate(
        client, 
        data.product_id, 
        data.from_unit_id, 
        data.to_unit_id, 
        data.type
      );

      if (duplicateExists) {
        throw new HttpException(409, 'Conversion with this combination already exists');
      }

      // Handle default flags - clear existing defaults if setting new ones
      if (data.is_default_purchase && data.type === 'purchase') {
        await ConversionRepository.clearDefaultPurchase(client, data.product_id);
      }
      if (data.is_default_sale && data.type === 'sale') {
        await ConversionRepository.clearDefaultSale(client, data.product_id);
      }

      // Create the conversion
      const createData: CreateConversionData = {
        product_id: data.product_id,
        from_unit_id: data.from_unit_id,
        to_unit_id: data.to_unit_id,
        to_unit_qty: data.to_unit_qty,
        to_unit_price: data.to_unit_price,
        type: data.type,
        is_default_purchase: data.is_default_purchase,
        is_default_sale: data.is_default_sale,
        created_by: data.created_by
      };

      const conversion = await ConversionRepository.create(client, createData);

      // Create initial conversion log
      await ConversionRepository.createLog(
        client, 
        conversion.id, 
        null, 
        data.to_unit_price, 
        data.note || null, 
        data.created_by || null
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
   * Get all conversion records
   */
  async findAll(): Promise<ProductConversionList[]> {
    return await ConversionRepository.findAll(pool);
  }

  /**
   * Update an existing conversion
   */
  async update(id: number, data: UpdateConversionRequest): Promise<Conversion> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current conversion
      const currentConversion = await ConversionRepository.findById(pool, id);
      if (!currentConversion) {
        throw new HttpException(404, 'Conversion not found');
      }

      // Check for duplicate (excluding current record)
      const duplicateExists = await ConversionRepository.checkDuplicateForUpdate(
        client, 
        data.product_id, 
        data.from_unit_id, 
        data.to_unit_id, 
        data.type, 
        id
      );

      if (duplicateExists) {
        throw new HttpException(409, 'Conversion with this combination already exists');
      }

      // Check if price has changed
      const priceChanged = currentConversion.to_unit_price !== data.to_unit_price;

      // Handle default flags - clear existing defaults if setting new ones
      if (data.is_default_purchase && data.type === 'purchase') {
        await ConversionRepository.clearDefaultPurchase(client, data.product_id);
      }
      if (data.is_default_sale && data.type === 'sale') {
        await ConversionRepository.clearDefaultSale(client, data.product_id);
      }

      // Update the conversion
      const updateData: UpdateConversionData = {
        product_id: data.product_id,
        from_unit_id: data.from_unit_id,
        to_unit_id: data.to_unit_id,
        to_unit_qty: data.to_unit_qty,
        to_unit_price: data.to_unit_price,
        type: data.type,
        is_default_purchase: data.is_default_purchase,
        is_default_sale: data.is_default_sale,
        updated_by: data.updated_by
      };

      const updatedConversion = await ConversionRepository.update(client, id, updateData);

      if (!updatedConversion) {
        throw new HttpException(404, 'Conversion not found or could not be updated');
      }

      // If price changed, handle conversion logs
      if (priceChanged) {
        // Close current active log
        await ConversionRepository.closeCurrentLog(client, id);

        // Create new log entry
        await ConversionRepository.createLog(
          client, 
          id, 
          currentConversion.to_unit_price, 
          data.to_unit_price, 
          data.note || null, 
          data.updated_by || null
        );
      }

      await client.query('COMMIT');
      return updatedConversion;

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
  async findById(id: number): Promise<ConversionDetailByProduct> {
    const conversion = await ConversionRepository.findConversionDetailById(pool, id);
    
    if (!conversion) {
      throw new HttpException(404, 'Conversion not found');
    }

    return conversion;
  }

  /**
   * Delete a conversion by ID
   */
  async deleteById(id: number): Promise<void> {
    await ConversionRepository.deleteById(pool, id);
  }

  /**
   * Get detailed conversion information for a product
   */
  async getProductConversionDetail(productId: number): Promise<ProductConversionDetail> {
    try {
      // Get full product info
      const productRow = await ConversionRepository.getProductFullInfo(pool, productId);
      
      if (!productRow) {
        throw new HttpException(404, 'Product not found');
      }

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
      const conversionsRows = await ConversionRepository.getConversionsByProduct(pool, productId);
      const conversions = conversionsRows.map(row => ({
        id: row.id,
        from_unit: row.from_unit,
        to_unit: row.to_unit,
        qty: parseFloat(String(row.qty)),
        price: parseFloat(String(row.price)),
        type: row.type,
        is_active: row.is_active
      }));

      // Get default units
      const [defaultPurchaseRow, defaultSaleRow] = await Promise.all([
        ConversionRepository.getDefaultPurchaseUnit(pool, productId),
        ConversionRepository.getDefaultSaleUnit(pool, productId)
      ]);

      const default_unit: { purchase?: DefaultUnit; sale?: DefaultUnit } = {};
      
      if (defaultPurchaseRow) {
        default_unit.purchase = {
          unit: defaultPurchaseRow.unit,
          qty: parseFloat(defaultPurchaseRow.qty),
          price: parseFloat(defaultPurchaseRow.price)
        };
      }

      if (defaultSaleRow) {
        default_unit.sale = {
          unit: defaultSaleRow.unit,
          qty: parseFloat(defaultSaleRow.qty),
          price: parseFloat(defaultSaleRow.price)
        };
      }

      // Get price history for all conversions of this product
      const historyRows = await ConversionRepository.getConversionPriceHistory(pool, productId);
      
      // Group history by conversion_id
      const historyGrouped = new Map<number, ConversionPriceHistory>();
      
      historyRows.forEach(row => {
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

  /**
   * Get conversions by product ID and type
   */
  async getConversionsByProductAndType(productId: number, type: 'purchase' | 'sale'): Promise<ProductConversionByType[]> {
    try {
      // Get conversions for the product and type
      const conversionsRows = await ConversionRepository.getConversionsByProductAndType(pool, productId, type);
      const conversions = conversionsRows.map(row => ({
        id: row.id,
        from_unit: row.from_unit,
        to_unit: row.to_unit,
        qty: parseFloat(String(row.qty)),
        price: parseFloat(String(row.price)),
        is_default: type === 'purchase' ? row.is_default_purchase : row.is_default_sale,
        is_active: row.is_active
      }));

      return conversions;

    } catch (error) {
      throw error;
    }
  }
} 