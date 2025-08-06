import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { SaleRepository, SaleTransaction, SaleTransactionItem, CreateTransactionData, CreateTransactionItemData, CreateStockData, UpdateTransactionData } from './sale.repository';
import { CreateSaleRequest, UpdateSaleRequest, SaleItemRequest } from './validators/sale.schema';
import { 
  validateTransactionItems, 
  validateSaleStockForCreate,
  validateSaleStockForUpdate
} from '../validators/transaction-item.validator';

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
      const transactionNo = await SaleRepository.generateTransactionNo(client);

      // 6. Create transaction
      const createTransactionData: CreateTransactionData = {
        transactionNo,
        date: data.date,
        description: data.description,
        totalAmount,
        totalPaid: data.total_paid,
        paymentType: data.payment_type,
        userId
      };
      
      const transaction = await SaleRepository.createTransaction(client, createTransactionData);

      // 7. Create transaction items and stock entries
      const items: SaleTransactionItem[] = [];
      
      for (const item of data.items) {
        // Create transaction item
        const createItemData: CreateTransactionItemData = {
          transactionId: transaction.id,
          productId: item.product_id,
          unitId: item.unit_id,
          qty: item.qty,
          description: `Sale of ${item.qty} units`
        };
        
        const itemResult = await SaleRepository.createTransactionItem(client, createItemData);

        // Create stock entry (negative for sales)
        const createStockData: CreateStockData = {
          productId: item.product_id,
          transactionId: transaction.id,
          qty: -item.qty, // Negative to reduce stock
          unitId: item.unit_id,
          description: `Sale transaction ${transactionNo}`,
          userId
        };
        
        await SaleRepository.createStock(client, createStockData);

        // Get product and unit names for response
        const productName = await SaleRepository.getProductName(client, item.product_id);
        const unitName = await SaleRepository.getUnitName(client, item.unit_id);

        items.push({
          id: itemResult.id,
          product_id: item.product_id,
          unit_id: item.unit_id,
          qty: item.qty,
          description: `Sale of ${item.qty} units`,
          product_name: productName,
          unit_name: unitName
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
      const existingItems = await SaleRepository.getExistingItems(client, id);

      // 7. Create reversal stock entries for all existing items
      for (const existingItem of existingItems) {
        const createReversalStockData: CreateStockData = {
          productId: existingItem.product_id,
          transactionId: id,
          qty: existingItem.qty, // Positive to reverse the original negative sale
          unitId: existingItem.unit_id,
          description: `Reversal for updated sale: ${existingItem.description}`,
          userId
        };
        
        await SaleRepository.createReversalStock(client, createReversalStockData);
      }

      // 8. Update the transaction
      const updateTransactionData: UpdateTransactionData = {
        transactionNo: existingTransaction.no,
        date: data.date,
        description: data.description,
        totalAmount,
        totalPaid: data.total_paid,
        paymentType: data.payment_type,
        userId
      };
      
      const transaction = await SaleRepository.updateTransaction(client, id, updateTransactionData);

      // 9. Delete existing transaction items
      await SaleRepository.deleteTransactionItems(client, id);

      // 10. Create new transaction items and stock entries
      const items: SaleTransactionItem[] = [];
      
      for (const item of data.items) {
        // Create new transaction item
        const createItemData: CreateTransactionItemData = {
          transactionId: id,
          productId: item.product_id,
          unitId: item.unit_id,
          qty: item.qty,
          description: `Sale of ${item.qty} units`
        };
        
        const itemResult = await SaleRepository.createTransactionItem(client, createItemData);

        // Create new stock entry (negative for sales)
        const createStockData: CreateStockData = {
          productId: item.product_id,
          transactionId: id,
          qty: -item.qty, // Negative to reduce stock
          unitId: item.unit_id,
          description: `Updated sale transaction ${transaction.no}`,
          userId
        };
        
        await SaleRepository.createStock(client, createStockData);

        // Get product and unit names for response
        const productName = await SaleRepository.getProductName(client, item.product_id);
        const unitName = await SaleRepository.getUnitName(client, item.unit_id);

        items.push({
          id: itemResult.id,
          product_id: item.product_id,
          unit_id: item.unit_id,
          qty: item.qty,
          description: `Sale of ${item.qty} units`,
          product_name: productName,
          unit_name: unitName
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
      const rows = await SaleRepository.getTransactionWithItems(pool, id);
      
      if (rows.length === 0) {
        return null;
      }

      const firstRow = rows[0];
      
      // Group items if there are multiple
      const items: SaleTransactionItem[] = rows
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
      const unitPrice = await SaleRepository.getConversionPrice(client, item.product_id, item.unit_id);

      // Calculate item total (quantity * unit price)
      const itemTotal = item.qty * unitPrice;
      totalAmount += itemTotal;
    }

    return totalAmount;
  }
} 