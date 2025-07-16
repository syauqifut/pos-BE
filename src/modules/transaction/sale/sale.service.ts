import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { saleQueries } from './sale.sql';
import { CreateSaleRequest, UpdateSaleRequest, SaleItemRequest } from './validators/sale.schema';
import { 
  validateTransactionItems, 
  validateSaleStockForCreate,
  validateSaleStockForUpdate
} from '../validators/transaction-item.validator';

export interface SaleTransaction {
  id: number;
  no: string;
  type: string;
  date: string;
  description?: string;
  total_amount: number;
  paid_amount: number;
  payment_type: 'cash' | 'card' | 'transfer';
  change: number;
  created_at: Date;
  created_by: number;
  created_by_name?: string;
  items: SaleTransactionItem[];
}

export interface SaleTransactionItem {
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

export class SaleService {
  /**
   * Create a new sale transaction
   */
  async create(data: CreateSaleRequest, userId: number): Promise<SaleTransaction> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Validate all products and units exist and are properly configured
      await validateTransactionItems(data.items, { type: 'sale' }, client);

      // 2. Calculate total amount from conversion prices
      const totalAmount = await this.calculateTotalAmount(data.items, client);

      // 3. Validate payment amount
      if (data.total_paid < totalAmount) {
        throw new HttpException(400, `Insufficient payment. Total amount: ${totalAmount}, paid: ${data.total_paid}, shortfall: ${totalAmount - data.total_paid}`);
      }

      // 4. Validate stock levels to prevent negative stock
      await validateSaleStockForCreate(data.items, client);

      // 5. Generate transaction number
      const transactionNoResult = await client.query(saleQueries.generateTransactionNo);
      const transactionNo = transactionNoResult.rows[0].transaction_no;

      // 6. Create transaction
      const transactionResult = await client.query(saleQueries.createTransaction, [
        transactionNo,
        data.date,
        data.description || null,
        totalAmount,
        data.total_paid,
        data.payment_type,
        userId
      ]);
      
      const transaction = transactionResult.rows[0];

      // 7. Create transaction items and stock entries
      const items: SaleTransactionItem[] = [];
      
      for (const item of data.items) {
        // Create transaction item
        const itemResult = await client.query(saleQueries.createTransactionItem, [
          transaction.id,
          item.product_id,
          item.unit_id,
          item.qty,
          `Sale of ${item.qty} units`
        ]);

        // Create stock entry (negative for sales)
        await client.query(saleQueries.createStock, [
          item.product_id,
          transaction.id,
          -item.qty, // Negative to reduce stock
          item.unit_id,
          `Sale transaction ${transactionNo}`,
          userId
        ]);

        // Get product and unit names for response
        const productResult = await client.query(saleQueries.getProductName, [item.product_id]);
        const unitResult = await client.query(saleQueries.getUnitName, [item.unit_id]);

        items.push({
          id: itemResult.rows[0].id,
          product_id: item.product_id,
          unit_id: item.unit_id,
          qty: item.qty,
          description: `Sale of ${item.qty} units`,
          product_name: productResult.rows[0]?.name || `Product ${item.product_id}`,
          unit_name: unitResult.rows[0]?.name || `Unit ${item.unit_id}`
        });
      }

      await client.query('COMMIT');

      // Calculate change (not stored in database)
      const change = data.total_paid - totalAmount;

      return {
        id: transaction.id,
        no: transaction.no,
        type: transaction.type,
        date: transaction.date,
        description: transaction.description,
        total_amount: transaction.total_amount,
        paid_amount: transaction.paid_amount,
        payment_type: transaction.payment_type,
        change,
        created_at: transaction.created_at,
        created_by: transaction.created_by,
        items
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating sale transaction:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(500, 'Internal server error while creating sale transaction');
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing sale transaction
   */
  async update(id: number, data: UpdateSaleRequest, userId: number): Promise<SaleTransaction> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Check if transaction exists and is a sale
      const existingTransaction = await this.findById(id);
      if (!existingTransaction) {
        throw new HttpException(404, 'Sale transaction not found');
      }

      // 2. Validate all new products and units exist and are properly configured
      await validateTransactionItems(data.items, { type: 'sale' }, client);

      // 3. Calculate new total amount
      const totalAmount = await this.calculateTotalAmount(data.items, client);

      // 4. Validate payment amount
      if (data.total_paid < totalAmount) {
        throw new HttpException(400, `Insufficient payment. Total amount: ${totalAmount}, paid: ${data.total_paid}, shortfall: ${totalAmount - data.total_paid}`);
      }

      // 5. Validate stock levels to prevent negative stock
      await validateSaleStockForUpdate(id, data.items, client);

      // 6. Get existing transaction items for reversal
      const existingItemsResult = await client.query(saleQueries.getExistingItems, [id]);
      const existingItems = existingItemsResult.rows;

      // 7. Create reversal stock entries for all existing items
      for (const existingItem of existingItems) {
        await client.query(saleQueries.createReversalStock, [
          existingItem.product_id,
          id,
          existingItem.qty, // Positive to reverse the original negative sale
          existingItem.unit_id,
          `Reversal for updated sale: ${existingItem.description}`,
          userId
        ]);
      }

      // 8. Update the transaction
      const transactionResult = await client.query(saleQueries.updateTransaction, [
        id,
        data.date,
        data.description || null,
        totalAmount,
        data.total_paid,
        data.payment_type,
        userId
      ]);
      
      const transaction = transactionResult.rows[0];

      // 9. Delete existing transaction items
      await client.query(saleQueries.deleteTransactionItems, [id]);

      // 10. Create new transaction items and stock entries
      const items: SaleTransactionItem[] = [];
      
      for (const item of data.items) {
        // Create new transaction item
        const itemResult = await client.query(saleQueries.createTransactionItem, [
          id,
          item.product_id,
          item.unit_id,
          item.qty,
          `Sale of ${item.qty} units`
        ]);

        // Create new stock entry (negative for sales)
        await client.query(saleQueries.createStock, [
          item.product_id,
          id,
          -item.qty, // Negative to reduce stock
          item.unit_id,
          `Updated sale transaction ${transaction.no}`,
          userId
        ]);

        // Get product and unit names for response
        const productResult = await client.query(saleQueries.getProductName, [item.product_id]);
        const unitResult = await client.query(saleQueries.getUnitName, [item.unit_id]);

        items.push({
          id: itemResult.rows[0].id,
          product_id: item.product_id,
          unit_id: item.unit_id,
          qty: item.qty,
          description: `Sale of ${item.qty} units`,
          product_name: productResult.rows[0]?.name || `Product ${item.product_id}`,
          unit_name: unitResult.rows[0]?.name || `Unit ${item.unit_id}`
        });
      }

      await client.query('COMMIT');

      // Calculate change (not stored in database)
      const change = data.total_paid - totalAmount;

      return {
        id: transaction.id,
        no: transaction.no,
        type: transaction.type,
        date: transaction.date,
        description: transaction.description,
        total_amount: transaction.total_amount,
        paid_amount: transaction.paid_amount,
        payment_type: transaction.payment_type,
        change,
        created_at: transaction.created_at,
        created_by: transaction.created_by,
        items
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating sale transaction:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(500, 'Internal server error while updating sale transaction');
    } finally {
      client.release();
    }
  }

  /**
   * Get sale transaction by ID
   */
  async findById(id: number): Promise<SaleTransaction | null> {
    try {
      const result = await pool.query(saleQueries.getTransactionWithItems, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const firstRow = result.rows[0];
      
      // Group items if there are multiple
      const items: SaleTransactionItem[] = result.rows
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

      // Calculate change
      const totalAmount = parseFloat(firstRow.total_amount) || 0;
      const paidAmount = parseFloat(firstRow.paid_amount) || 0;
      const change = paidAmount - totalAmount;

      return {
        id: firstRow.id,
        no: firstRow.no,
        type: firstRow.type,
        date: firstRow.date,
        description: firstRow.transaction_description,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        payment_type: firstRow.payment_type,
        change,
        created_at: firstRow.created_at,
        created_by: firstRow.created_by,
        created_by_name: firstRow.created_by_name,
        items
      };

    } catch (error) {
      console.error('Error fetching sale transaction:', error);
      throw new HttpException(500, 'Internal server error while fetching sale transaction');
    }
  }

  /**
   * Calculate total amount based on conversion prices
   */
  private async calculateTotalAmount(items: SaleItemRequest[], client: any): Promise<number> {
    let totalAmount = 0;

    for (const item of items) {
      // Get conversion price for this product-unit combination
      const priceResult = await client.query(saleQueries.getConversionPrice, [item.product_id, item.unit_id]);
      
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