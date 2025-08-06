import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { PurchaseRepository, PurchaseTransaction, PurchaseTransactionItem, CreateTransactionData, CreateTransactionItemData, CreateStockData, UpdateTransactionData } from './purchase.repository';
import { CreatePurchaseRequest, UpdatePurchaseRequest, PurchaseItemRequest } from './validators/purchase.schema';
import { validateTransactionItems } from '../validators/transaction-item.validator';

export class PurchaseService {
  /**
   * Create a new purchase transaction
   */
  async create(data: CreatePurchaseRequest, userId: number): Promise<PurchaseTransaction> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Validate all products and units exist and are properly configured
      await validateTransactionItems(data.items, { type: 'purchase' }, client);

      // 2. Calculate total amount from conversion prices
      const totalAmount = await this.calculateTotalAmount(data.items, client);

      // 3. Generate transaction number
      const transactionNo = await PurchaseRepository.generateTransactionNo(client);

      // 4. Create transaction
      const createTransactionData: CreateTransactionData = {
        transactionNo,
        date: data.date,
        description: data.description,
        totalAmount,
        userId
      };
      
      const transaction = await PurchaseRepository.createTransaction(client, createTransactionData);

      // 5. Create transaction items and stock entries
      const items: PurchaseTransactionItem[] = [];
      
      for (const item of data.items) {
        // Create transaction item
        const createItemData: CreateTransactionItemData = {
          transactionId: transaction.id,
          productId: item.product_id,
          unitId: item.unit_id,
          qty: item.qty,
          description: `Purchase of ${item.qty} units`
        };
        
        const itemResult = await PurchaseRepository.createTransactionItem(client, createItemData);

        // Create stock entry (all purchases increase stock)
        const createStockData: CreateStockData = {
          productId: item.product_id,
          transactionId: transaction.id,
          qty: item.qty, // Always positive for purchases
          unitId: item.unit_id,
          description: `Purchase transaction ${transactionNo}`,
          userId
        };
        
        await PurchaseRepository.createStock(client, createStockData);

        // Get product and unit names for response
        const productName = await PurchaseRepository.getProductName(client, item.product_id);
        const unitName = await PurchaseRepository.getUnitName(client, item.unit_id);

        items.push({
          id: itemResult.id,
          product_id: item.product_id,
          unit_id: item.unit_id,
          qty: item.qty,
          description: `Purchase of ${item.qty} units`,
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
        total_amount: transaction.total_amount,
        created_at: transaction.created_at,
        created_by: transaction.created_by,
        items
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating purchase transaction:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(500, 'Internal server error while creating purchase transaction');
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing purchase transaction
   */
  async update(id: number, data: UpdatePurchaseRequest, userId: number): Promise<PurchaseTransaction> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Check if transaction exists and is a purchase
      const existingTransaction = await this.findById(id);
      if (!existingTransaction) {
        throw new HttpException(404, 'Purchase transaction not found');
      }

      // 2. Validate all new products and units exist and are properly configured
      await validateTransactionItems(data.items, { type: 'purchase' }, client);

      // 3. Calculate new total amount
      const totalAmount = await this.calculateTotalAmount(data.items, client);

      // 4. Get existing transaction items for reversal
      const existingItems = await PurchaseRepository.getExistingItems(client, id);

      // 5. Create reversal stock entries for all existing items
      for (const existingItem of existingItems) {
        const createReversalStockData: CreateStockData = {
          productId: existingItem.product_id,
          transactionId: id,
          qty: -existingItem.qty, // Negative to reverse the original quantity
          unitId: existingItem.unit_id,
          description: `Reversal for updated purchase: ${existingItem.description}`,
          userId
        };
        
        await PurchaseRepository.createReversalStock(client, createReversalStockData);
      }

      // 6. Update the transaction
      const updateTransactionData: UpdateTransactionData = {
        transactionNo: existingTransaction.no,
        date: data.date,
        description: data.description,
        totalAmount,
        userId
      };
      
      const transaction = await PurchaseRepository.updateTransaction(client, id, updateTransactionData);

      // 7. Delete existing transaction items
      await PurchaseRepository.deleteTransactionItems(client, id);

      // 8. Create new transaction items and stock entries
      const items: PurchaseTransactionItem[] = [];
      
      for (const item of data.items) {
        // Create new transaction item
        const createItemData: CreateTransactionItemData = {
          transactionId: id,
          productId: item.product_id,
          unitId: item.unit_id,
          qty: item.qty,
          description: `Purchase of ${item.qty} units`
        };
        
        const itemResult = await PurchaseRepository.createTransactionItem(client, createItemData);

        // Create new stock entry
        const createStockData: CreateStockData = {
          productId: item.product_id,
          transactionId: id,
          qty: item.qty, // Always positive for purchases
          unitId: item.unit_id,
          description: `Updated purchase transaction ${transaction.no}`,
          userId
        };
        
        await PurchaseRepository.createStock(client, createStockData);

        // Get product and unit names for response
        const productName = await PurchaseRepository.getProductName(client, item.product_id);
        const unitName = await PurchaseRepository.getUnitName(client, item.unit_id);

        items.push({
          id: itemResult.id,
          product_id: item.product_id,
          unit_id: item.unit_id,
          qty: item.qty,
          description: `Purchase of ${item.qty} units`,
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
        total_amount: transaction.total_amount,
        created_at: transaction.created_at,
        created_by: transaction.created_by,
        items
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating purchase transaction:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(500, 'Internal server error while updating purchase transaction');
    } finally {
      client.release();
    }
  }

  /**
   * Get purchase transaction by ID
   */
  async findById(id: number): Promise<PurchaseTransaction | null> {
    try {
      const rows = await PurchaseRepository.getTransactionWithItems(pool, id);
      
      if (rows.length === 0) {
        return null;
      }

      const firstRow = rows[0];
      
      // Group items if there are multiple
      const items: PurchaseTransactionItem[] = rows
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
        total_amount: parseFloat(firstRow.total_amount) || 0,
        created_at: firstRow.created_at,
        created_by: firstRow.created_by,
        created_by_name: firstRow.created_by_name,
        items
      };

    } catch (error) {
      console.error('Error fetching purchase transaction:', error);
      throw new HttpException(500, 'Internal server error while fetching purchase transaction');
    }
  }

  /**
   * Calculate total amount based on conversion prices
   */
  private async calculateTotalAmount(items: PurchaseItemRequest[], client: any): Promise<number> {
    let totalAmount = 0;

    for (const item of items) {
      // Get conversion price for this product-unit combination
      const unitPrice = await PurchaseRepository.getConversionPrice(client, item.product_id, item.unit_id);

      // Calculate item total (quantity * unit price)
      const itemTotal = item.qty * unitPrice;
      totalAmount += itemTotal;
    }

    return totalAmount;
  }
} 