import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { AdjustmentRepository, AdjustmentTransaction, AdjustmentTransactionItem, CreateTransactionData, CreateTransactionItemData, CreateStockData, UpdateTransactionData } from './adjustment.repository';
import { CreateAdjustmentRequest, UpdateAdjustmentRequest, AdjustmentItemRequest } from './validators/adjustment.schema';
import { 
  validateTransactionItems, 
  validateAdjustmentStockForCreate,
  validateAdjustmentStockForUpdate
} from '../validators/transaction-item.validator';

export class AdjustmentService {
  /**
   * Create a new adjustment transaction
   */
  async create(data: CreateAdjustmentRequest, userId: number): Promise<AdjustmentTransaction> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Validate all products and units exist and are properly configured
      await validateTransactionItems(data.items, { type: 'adjustment' }, client);

      // 2. Validate stock levels to prevent negative stock
      await validateAdjustmentStockForCreate(data.items, client);

      // 3. Generate transaction number
      const transactionNo = await AdjustmentRepository.generateTransactionNo(client);

      // 4. Create transaction
      const createTransactionData: CreateTransactionData = {
        transactionNo,
        date: data.date,
        description: data.description,
        userId
      };
      
      const transaction = await AdjustmentRepository.createTransaction(client, createTransactionData);

      // 5. Create transaction items and stock entries
      const items: AdjustmentTransactionItem[] = [];
      
      for (const item of data.items) {
        // Create transaction item
        const createItemData: CreateTransactionItemData = {
          transactionId: transaction.id,
          productId: item.product_id,
          unitId: item.unit_id,
          qty: item.qty,
          description: item.description
        };
        
        const itemResult = await AdjustmentRepository.createTransactionItem(client, createItemData);

        // Create stock entry
        const createStockData: CreateStockData = {
          productId: item.product_id,
          transactionId: transaction.id,
          qty: item.qty,
          unitId: item.unit_id,
          description: item.description,
          userId
        };
        
        await AdjustmentRepository.createStock(client, createStockData);

        // Get product and unit names for response
        const productName = await AdjustmentRepository.getProductName(client, item.product_id);
        const unitName = await AdjustmentRepository.getUnitName(client, item.unit_id);

        items.push({
          id: itemResult.id,
          product_id: item.product_id,
          unit_id: item.unit_id,
          qty: item.qty,
          description: item.description,
          product_name: productName,
          unit_name: unitName
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
      const rows = await AdjustmentRepository.getTransactionWithItems(pool, id);
      
      if (rows.length === 0) {
        return null;
      }

      const firstRow = rows[0];
      
      // Group items if there are multiple
      const items: AdjustmentTransactionItem[] = rows
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

      // 2. Validate all new products and units exist and are properly configured
      await validateTransactionItems(data.items, { type: 'adjustment' }, client);

      // 3. Validate stock levels to prevent negative stock
      await validateAdjustmentStockForUpdate(id, data.items, client);

      // 4. Get existing transaction items for reversal
      const existingItems = await AdjustmentRepository.getExistingItems(client, id);

      // 5. Create reversal stock entries for all existing items
      for (const existingItem of existingItems) {
        const createReversalStockData: CreateStockData = {
          productId: existingItem.product_id,
          transactionId: id,
          qty: -existingItem.qty, // Negative to reverse the original quantity
          unitId: existingItem.unit_id,
          description: `Reversal for updated adjustment: ${existingItem.description}`,
          userId
        };
        
        await AdjustmentRepository.createReversalStock(client, createReversalStockData);
      }

      // 6. Update the transaction
      const updateTransactionData: UpdateTransactionData = {
        date: data.date,
        description: data.description,
        userId
      };
      
      const transaction = await AdjustmentRepository.updateTransaction(client, id, updateTransactionData);

      // 7. Delete existing transaction items
      await AdjustmentRepository.deleteTransactionItems(client, id);

      // 8. Create new transaction items and stock entries
      const items: AdjustmentTransactionItem[] = [];
      
      for (const item of data.items) {
        // Create new transaction item
        const createItemData: CreateTransactionItemData = {
          transactionId: id,
          productId: item.product_id,
          unitId: item.unit_id,
          qty: item.qty,
          description: item.description
        };
        
        const itemResult = await AdjustmentRepository.createTransactionItem(client, createItemData);

        // Create new stock entry
        const createStockData: CreateStockData = {
          productId: item.product_id,
          transactionId: id,
          qty: item.qty,
          unitId: item.unit_id,
          description: item.description,
          userId
        };
        
        await AdjustmentRepository.createStock(client, createStockData);

        // Get product and unit names for response
        const productName = await AdjustmentRepository.getProductName(client, item.product_id);
        const unitName = await AdjustmentRepository.getUnitName(client, item.unit_id);

        items.push({
          id: itemResult.id,
          product_id: item.product_id,
          unit_id: item.unit_id,
          qty: item.qty,
          description: item.description,
          product_name: productName,
          unit_name: unitName
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
} 