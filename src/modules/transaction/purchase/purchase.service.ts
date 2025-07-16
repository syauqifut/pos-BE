import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { purchaseQueries } from './purchase.sql';
import { CreatePurchaseRequest, UpdatePurchaseRequest, PurchaseItemRequest } from './validators/purchase.schema';
import { validateTransactionItems } from '../validators/transaction-item.validator';

export interface PurchaseTransaction {
  id: number;
  no: string;
  type: string;
  date: string;
  description?: string;
  total_amount: number;
  created_at: Date;
  created_by: number;
  created_by_name?: string;
  items: PurchaseTransactionItem[];
}

export interface PurchaseTransactionItem {
  id: number;
  product_id: number;
  unit_id: number;
  qty: number;
  description?: string;
  product_name: string;
  sku?: string;
  barcode?: string;
  unit_name: string;
}

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
      const transactionNoResult = await client.query(purchaseQueries.generateTransactionNo);
      const transactionNo = transactionNoResult.rows[0].transaction_no;

      // 4. Create transaction
      const transactionResult = await client.query(purchaseQueries.createTransaction, [
        transactionNo,
        data.date,
        data.description || null,
        totalAmount,
        userId
      ]);
      
      const transaction = transactionResult.rows[0];

      // 5. Create transaction items and stock entries
      const items: PurchaseTransactionItem[] = [];
      
      for (const item of data.items) {
        // Create transaction item
        const itemResult = await client.query(purchaseQueries.createTransactionItem, [
          transaction.id,
          item.product_id,
          item.unit_id,
          item.qty,
          `Purchase of ${item.qty} units`
        ]);

        // Create stock entry (all purchases increase stock)
        await client.query(purchaseQueries.createStock, [
          item.product_id,
          transaction.id,
          item.qty, // Always positive for purchases
          item.unit_id,
          `Purchase transaction ${transactionNo}`,
          userId
        ]);

        // Get product and unit names for response
        const productResult = await client.query(purchaseQueries.getProductName, [item.product_id]);
        const unitResult = await client.query(purchaseQueries.getUnitName, [item.unit_id]);

        items.push({
          id: itemResult.rows[0].id,
          product_id: item.product_id,
          unit_id: item.unit_id,
          qty: item.qty,
          description: `Purchase of ${item.qty} units`,
          product_name: productResult.rows[0]?.name || `Product ${item.product_id}`,
          unit_name: unitResult.rows[0]?.name || `Unit ${item.unit_id}`
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
      const existingItemsResult = await client.query(purchaseQueries.getExistingItems, [id]);
      const existingItems = existingItemsResult.rows;

      // 5. Create reversal stock entries for all existing items
      for (const existingItem of existingItems) {
        await client.query(purchaseQueries.createReversalStock, [
          existingItem.product_id,
          id,
          -existingItem.qty, // Negative to reverse the original quantity
          existingItem.unit_id,
          `Reversal for updated purchase: ${existingItem.description}`,
          userId
        ]);
      }

      // 6. Update the transaction
      const transactionResult = await client.query(purchaseQueries.updateTransaction, [
        id,
        data.date,
        data.description || null,
        totalAmount,
        userId
      ]);
      
      const transaction = transactionResult.rows[0];

      // 7. Delete existing transaction items
      await client.query(purchaseQueries.deleteTransactionItems, [id]);

      // 8. Create new transaction items and stock entries
      const items: PurchaseTransactionItem[] = [];
      
      for (const item of data.items) {
        // Create new transaction item
        const itemResult = await client.query(purchaseQueries.createTransactionItem, [
          id,
          item.product_id,
          item.unit_id,
          item.qty,
          `Purchase of ${item.qty} units`
        ]);

        // Create new stock entry
        await client.query(purchaseQueries.createStock, [
          item.product_id,
          id,
          item.qty, // Always positive for purchases
          item.unit_id,
          `Updated purchase transaction ${transaction.no}`,
          userId
        ]);

        // Get product and unit names for response
        const productResult = await client.query(purchaseQueries.getProductName, [item.product_id]);
        const unitResult = await client.query(purchaseQueries.getUnitName, [item.unit_id]);

        items.push({
          id: itemResult.rows[0].id,
          product_id: item.product_id,
          unit_id: item.unit_id,
          qty: item.qty,
          description: `Purchase of ${item.qty} units`,
          product_name: productResult.rows[0]?.name || `Product ${item.product_id}`,
          unit_name: unitResult.rows[0]?.name || `Unit ${item.unit_id}`
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
      const result = await pool.query(purchaseQueries.getTransactionWithItems, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const firstRow = result.rows[0];
      
      // Group items if there are multiple
      const items: PurchaseTransactionItem[] = result.rows
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
      const priceResult = await client.query(purchaseQueries.getConversionPrice, [item.product_id, item.unit_id]);
      
      let unitPrice = 0;
      if (priceResult.rows.length > 0) {
        unitPrice = parseFloat(priceResult.rows[0].to_unit_price) || 0;
      }

      // Calculate item total (quantity * unit price)
      const itemTotal = item.qty * unitPrice;
      totalAmount += itemTotal;
    }

    return totalAmount;
  }
} 