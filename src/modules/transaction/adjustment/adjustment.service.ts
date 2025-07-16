import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { adjustmentQueries } from './adjustment.sql';
import { CreateAdjustmentRequest, UpdateAdjustmentRequest, AdjustmentItemRequest } from './validators/adjustment.schema';

export interface AdjustmentTransaction {
  id: number;
  no: string;
  type: string;
  date: string;
  description?: string;
  created_at: Date;
  created_by: number;
  created_by_name?: string;
  items: AdjustmentTransactionItem[];
}

export interface AdjustmentTransactionItem {
  id: number;
  product_id: number;
  unit_id: number;
  qty: number;
  description: string;
  product_name: string;
  sku?: string;
  barcode?: string;
  unit_name: string;
}

export class AdjustmentService {
  /**
   * Create a new adjustment transaction
   */
  async create(data: CreateAdjustmentRequest, userId: number): Promise<AdjustmentTransaction> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Validate all products and units exist
      await this.validateItems(data.items, client);

      // 2. Validate stock levels to prevent negative stock
      await this.validateStockForCreate(data.items, client);

      // 3. Generate transaction number
      const transactionNoResult = await client.query(adjustmentQueries.generateTransactionNo);
      const transactionNo = transactionNoResult.rows[0].transaction_no;

      // 4. Create transaction
      const transactionResult = await client.query(adjustmentQueries.createTransaction, [
        transactionNo,
        data.date,
        data.description || null,
        userId
      ]);
      
      const transaction = transactionResult.rows[0];

      // 5. Create transaction items and stock entries
      const items: AdjustmentTransactionItem[] = [];
      
      for (const item of data.items) {
        // Create transaction item
        const itemResult = await client.query(adjustmentQueries.createTransactionItem, [
          transaction.id,
          item.product_id,
          item.unit_id,
          item.qty,
          item.description
        ]);

        // Create stock entry
        await client.query(adjustmentQueries.createStock, [
          item.product_id,
          transaction.id,
          item.qty,
          item.unit_id,
          item.description,
          userId
        ]);

        // Get product and unit names for response
        const productResult = await client.query(adjustmentQueries.validateProduct, [item.product_id]);
        const unitResult = await client.query(adjustmentQueries.validateUnit, [item.unit_id]);

        items.push({
          id: itemResult.rows[0].id,
          product_id: item.product_id,
          unit_id: item.unit_id,
          qty: item.qty,
          description: item.description,
          product_name: productResult.rows[0].name,
          unit_name: unitResult.rows[0].name
        });
      }

      await client.query('COMMIT');

      return {
        id: transaction.id,
        no: transaction.no,
        type: transaction.type,
        date: transaction.date,
        description: transaction.description,
        created_at: transaction.created_at,
        created_by: transaction.created_by,
        items
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating adjustment transaction:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(500, 'Internal server error while creating adjustment transaction');
    } finally {
      client.release();
    }
  }

  /**
   * Get adjustment transaction by ID
   */
  async findById(id: number): Promise<AdjustmentTransaction | null> {
    try {
      const result = await pool.query(adjustmentQueries.getTransactionWithItems, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const firstRow = result.rows[0];
      
      // Group items if there are multiple
      const items: AdjustmentTransactionItem[] = result.rows
        .filter(row => row.item_id) // Only rows with items
        .map(row => ({
          id: row.item_id,
          product_id: row.product_id,
          unit_id: row.unit_id,
          qty: parseFloat(row.qty),
          description: row.item_description,
          product_name: row.product_name,
          sku: row.sku,
          barcode: row.barcode,
          unit_name: row.unit_name
        }));

      return {
        id: firstRow.id,
        no: firstRow.no,
        type: firstRow.type,
        date: firstRow.date,
        description: firstRow.transaction_description,
        created_at: firstRow.created_at,
        created_by: firstRow.created_by,
        created_by_name: firstRow.created_by_name,
        items
      };

    } catch (error) {
      console.error('Error fetching adjustment transaction:', error);
      throw new HttpException(500, 'Internal server error while fetching adjustment transaction');
    }
  }

  /**
   * Update an existing adjustment transaction
   */
  async update(id: number, data: UpdateAdjustmentRequest, userId: number): Promise<AdjustmentTransaction> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Check if transaction exists and is an adjustment
      const existingTransaction = await this.findById(id);
      if (!existingTransaction) {
        throw new HttpException(404, 'Adjustment transaction not found');
      }

      // 2. Validate all new products and units exist
      await this.validateItems(data.items, client);

      // 3. Validate stock levels to prevent negative stock
      await this.validateStockForUpdate(id, data.items, client);

      // 4. Get existing transaction items for reversal
      const existingItemsResult = await client.query(adjustmentQueries.getExistingItems, [id]);
      const existingItems = existingItemsResult.rows;

      // 5. Create reversal stock entries for all existing items
      for (const existingItem of existingItems) {
        await client.query(adjustmentQueries.createReversalStock, [
          existingItem.product_id,
          id,
          -existingItem.qty, // Negative to reverse the original quantity
          existingItem.unit_id,
          `Reversal for updated adjustment: ${existingItem.description}`,
          userId
        ]);
      }

      // 6. Update the transaction
      const transactionResult = await client.query(adjustmentQueries.updateTransaction, [
        id,
        data.date,
        data.description || null,
        userId
      ]);
      
      const transaction = transactionResult.rows[0];

      // 7. Delete existing transaction items
      await client.query(adjustmentQueries.deleteTransactionItems, [id]);

      // 8. Create new transaction items and stock entries
      const items: AdjustmentTransactionItem[] = [];
      
      for (const item of data.items) {
        // Create new transaction item
        const itemResult = await client.query(adjustmentQueries.createTransactionItem, [
          id,
          item.product_id,
          item.unit_id,
          item.qty,
          item.description
        ]);

        // Create new stock entry
        await client.query(adjustmentQueries.createStock, [
          item.product_id,
          id,
          item.qty,
          item.unit_id,
          item.description,
          userId
        ]);

        // Get product and unit names for response
        const productResult = await client.query(adjustmentQueries.validateProduct, [item.product_id]);
        const unitResult = await client.query(adjustmentQueries.validateUnit, [item.unit_id]);

        items.push({
          id: itemResult.rows[0].id,
          product_id: item.product_id,
          unit_id: item.unit_id,
          qty: item.qty,
          description: item.description,
          product_name: productResult.rows[0].name,
          unit_name: unitResult.rows[0].name
        });
      }

      await client.query('COMMIT');

      return {
        id: transaction.id,
        no: transaction.no,
        type: transaction.type,
        date: transaction.date,
        description: transaction.description,
        created_at: transaction.created_at,
        created_by: transaction.created_by,
        items
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating adjustment transaction:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(500, 'Internal server error while updating adjustment transaction');
    } finally {
      client.release();
    }
  }

  /**
   * Validate that all products and units exist and are properly configured
   */
  private async validateItems(items: AdjustmentItemRequest[], client: any): Promise<void> {
    for (const item of items) {
      // Validate product exists and is active
      const productResult = await client.query(adjustmentQueries.validateProduct, [item.product_id]);
      if (productResult.rows.length === 0) {
        throw new HttpException(400, `Product with ID ${item.product_id} not found or inactive`);
      }

      // Validate unit exists
      const unitResult = await client.query(adjustmentQueries.validateUnit, [item.unit_id]);
      if (unitResult.rows.length === 0) {
        throw new HttpException(400, `Unit with ID ${item.unit_id} not found`);
      }

      // Validate that unit_id exists in conversions table for the given product_id
      const conversionResult = await client.query(adjustmentQueries.validateProductUnitConversion, [item.product_id, item.unit_id]);
      if (conversionResult.rows.length === 0) {
        const productName = productResult.rows[0]?.name || `ID ${item.product_id}`;
        const unitName = unitResult.rows[0]?.name || `ID ${item.unit_id}`;
        throw new HttpException(400, `Unit "${unitName}" is not configured for product "${productName}". Please configure a conversion for this product-unit combination first.`);
      }
    }
  }

  /**
   * Validate stock levels for CREATE operation
   */
  private async validateStockForCreate(items: AdjustmentItemRequest[], client: any): Promise<void> {
    for (const item of items) {
      // Get current stock for this product/unit combination
      const stockResult = await client.query(adjustmentQueries.getCurrentStock, [item.product_id, item.unit_id]);
      const currentStock = parseFloat(stockResult.rows[0].current_stock) || 0;
      
      // Calculate resulting stock after adjustment
      const resultingStock = currentStock + item.qty;
      
      // Check if resulting stock would be negative
      if (resultingStock < 0) {
        // Get product and unit names for better error message
        const productResult = await client.query(adjustmentQueries.validateProduct, [item.product_id]);
        const unitResult = await client.query(adjustmentQueries.validateUnit, [item.unit_id]);
        
        const productName = productResult.rows[0]?.name || `ID ${item.product_id}`;
        const unitName = unitResult.rows[0]?.name || `ID ${item.unit_id}`;
        
        throw new HttpException(400, 
          `Stock for product "${productName}" with unit "${unitName}" would become negative (current: ${currentStock}, adjustment: ${item.qty}, resulting: ${resultingStock}). Adjustment rejected.`
        );
      }
    }
  }

  /**
   * Validate stock levels for UPDATE operation
   */
  private async validateStockForUpdate(transactionId: number, newItems: AdjustmentItemRequest[], client: any): Promise<void> {
    // Get existing items for this transaction
    const existingItemsResult = await client.query(adjustmentQueries.getExistingItems, [transactionId]);
    const existingItems = existingItemsResult.rows;
    
    // Create a map of existing items by product_id + unit_id for quick lookup
    const existingItemsMap = new Map<string, any>();
    existingItems.forEach((item: any) => {
      const key = `${item.product_id}-${item.unit_id}`;
      existingItemsMap.set(key, item);
    });
    
    // Validate each new item
    for (const newItem of newItems) {
      // Get current stock for this product/unit combination
      const stockResult = await client.query(adjustmentQueries.getCurrentStock, [newItem.product_id, newItem.unit_id]);
      const currentStock = parseFloat(stockResult.rows[0].current_stock) || 0;
      
      // Check if there's an existing item for this product/unit combination
      const key = `${newItem.product_id}-${newItem.unit_id}`;
      const existingItem = existingItemsMap.get(key);
      
      let resultingStock: number;
      
      if (existingItem) {
        // Simulate: current_stock - old_qty + new_qty
        resultingStock = currentStock - existingItem.qty + newItem.qty;
      } else {
        // No existing item for this product/unit, just add the new quantity
        resultingStock = currentStock + newItem.qty;
      }
      
      // Check if resulting stock would be negative
      if (resultingStock < 0) {
        // Get product and unit names for better error message
        const productResult = await client.query(adjustmentQueries.validateProduct, [newItem.product_id]);
        const unitResult = await client.query(adjustmentQueries.validateUnit, [newItem.unit_id]);
        
        const productName = productResult.rows[0]?.name || `ID ${newItem.product_id}`;
        const unitName = unitResult.rows[0]?.name || `ID ${newItem.unit_id}`;
        
        const oldQty = existingItem ? existingItem.qty : 0;
        
        throw new HttpException(400, 
          `Stock for product "${productName}" with unit "${unitName}" would become negative (current: ${currentStock}, old adjustment: ${oldQty}, new adjustment: ${newItem.qty}, resulting: ${resultingStock}). Adjustment rejected.`
        );
      }
    }
  }
} 