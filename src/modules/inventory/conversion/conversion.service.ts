import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { ConversionRepository, Conversion, CreateConversionData, UpdateConversionData, ProductConversionDetail, DefaultUnit, PriceHistoryItem, ConversionPriceHistory, ProductConversionList, ConversionDetailByProduct, FindAllConversionOptions, PaginatedResult } from './conversion.repository';

export interface CreateConversionRequest {
  product_id: number;
  unit_id: number;
  unit_qty: number;
  unit_price: number;
  type: string;
  is_default?: boolean;
  note?: string;
  created_by?: number;
}

export interface UpdateConversionRequest {
  product_id: number;
  unit_id: number;
  unit_qty: number;
  unit_price: number;
  type: string;
  is_default?: boolean;
  note?: string;
  updated_by?: number;
}

export interface ProductConversionByType {
  id: number;
  unit_id: number;
  unit: string;
  qty: number;
  price: number;
  is_default: boolean;
  is_active: boolean;
}

export interface DefaultConversionByProductId {
  default_sale: ProductConversionByType;
  default_purchase: ProductConversionByType;
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
        data.unit_id, 
        data.type
      );

      if (duplicateExists) {
        throw new HttpException(409, 'Conversion with this combination already exists');
      }

      // Handle default flag - clear existing default if setting new one
      if (data.is_default) {
        await ConversionRepository.clearDefault(client, data.product_id, data.type);
      }

      // Create the conversion
      const createData: CreateConversionData = {
        product_id: data.product_id,
        unit_id: data.unit_id,
        unit_qty: data.unit_qty,
        unit_price: data.unit_price,
        type: data.type,
        is_default: data.is_default,
        created_by: data.created_by
      };

      const conversion = await ConversionRepository.create(client, createData);

      // Create initial conversion log
      await ConversionRepository.createLog(
        client, 
        conversion.id, 
        null, 
        data.unit_price, 
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
   * Get all conversion records with pagination
   */
  async findAll(options: FindAllConversionOptions = {}): Promise<PaginatedResult<ProductConversionList>> {
    return await ConversionRepository.findAll(pool, options);
  }

  /**
   * Get all conversion records (legacy method for backward compatibility)
   */
  async findAllLegacy(): Promise<ProductConversionList[]> {
    return await ConversionRepository.findAllLegacy(pool);
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
        data.unit_id, 
        data.type, 
        id
      );

      if (duplicateExists) {
        throw new HttpException(409, 'Conversion with this combination already exists');
      }

      // Check if price has changed
      const priceChanged = currentConversion.unit_price !== data.unit_price;

      // Handle default flag - clear existing default if setting new one
      if (data.is_default) {
        await ConversionRepository.clearDefault(client, data.product_id, data.type);
      }

      // Update the conversion
      const updateData: UpdateConversionData = {
        product_id: data.product_id,
        unit_id: data.unit_id,
        unit_qty: data.unit_qty,
        unit_price: data.unit_price,
        type: data.type,
        is_default: data.is_default,
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
          currentConversion.unit_price, 
          data.unit_price, 
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
        manufacturer: productRow.manufacturer_id ? {
          id: productRow.manufacturer_id,
          name: productRow.manufacturer_name
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
        unit: row.unit,
        qty: parseFloat(String(row.qty)),
        price: parseFloat(String(row.price)),
        type: row.type,
        is_active: row.is_active
      }));

      // Get default units
      const [defaultPurchaseRow, defaultSaleRow] = await Promise.all([
        ConversionRepository.getDefaultUnit(pool, productId, 'purchase'),
        ConversionRepository.getDefaultUnit(pool, productId, 'sale')
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
            unit: row.unit,
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
  async getConversionsByProductAndType(productId: number, type: 'purchase' | 'sale' | 'all'): Promise<ProductConversionByType[]> {
    try {
      if (type === 'all') {
        // Get both purchase and sale conversions
        const [purchaseRows, saleRows] = await Promise.all([
          ConversionRepository.getConversionsByProductAndType(pool, productId, 'purchase'),
          ConversionRepository.getConversionsByProductAndType(pool, productId, 'sale')
        ]);

        // Create a map to track unique conversions (unit_id combination)
        const uniqueConversions = new Map<string, any>();

        // Process purchase conversions first
        purchaseRows.forEach(row => {
          const key = `${row.unit_id}`;
          if (!uniqueConversions.has(key)) {
            uniqueConversions.set(key, {
              id: row.id,
              unit_id: row.unit_id,
              unit: row.unit,
              qty: parseFloat(String(row.qty)),
              price: parseFloat(String(row.price)),
              is_default: row.is_default,
              is_active: row.is_active
            });
          }
        });

        // Process sale conversions, use sale is_default for conflicts
        saleRows.forEach(row => {
          const key = `${row.unit_id}`;
          if (!uniqueConversions.has(key)) {
            uniqueConversions.set(key, {
              id: row.id,
              unit_id: row.unit_id,
              unit: row.unit,
              qty: parseFloat(String(row.qty)),
              price: parseFloat(String(row.price)),
              is_default: row.is_default,
              is_active: row.is_active
            });
          } else {
            // If conversion already exists, update is_default to use sale value
            const existing = uniqueConversions.get(key);
            existing.is_default = row.is_default;
          }
        });

        return Array.from(uniqueConversions.values());
      } else {
        // Get conversions for the specific type
        const conversionsRows = await ConversionRepository.getConversionsByProductAndType(pool, productId, type);
        const conversions = conversionsRows.map(row => ({
          id: row.id,
          unit_id: row.unit_id,
          unit: row.unit,
          qty: parseFloat(String(row.qty)),
          price: parseFloat(String(row.price)),
          is_default: row.is_default,
          is_active: row.is_active
        }));

        return conversions;
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get default conversion by product ID
   */
  async getDefaultConversionByProductId(productId: number): Promise<DefaultConversionByProductId> {
    const defaultSale = await ConversionRepository.getDefaultConversionByProductId(pool, productId, 'sale');
    const defaultPurchase = await ConversionRepository.getDefaultConversionByProductId(pool, productId, 'purchase');
    return {
      default_sale: defaultSale,
      default_purchase: defaultPurchase
    };
  }
} 