import { HttpException } from '../../exceptions/HttpException';
import { SaleService } from '../transaction/sale/sale.service';
import { SaleRepository } from '../transaction/sale/sale.repository';
import { generateTestTemplate } from './templates/test.template';
import { generateTransactionTemplate, TransactionPrintData } from './templates/transaction.template';
import db from '../../db';

export class PrintService {
  private saleService: SaleService;

  constructor() {
    this.saleService = new SaleService();
  }

  /**
   * Generate test print data (static data)
   */
  async generateTestPrint(): Promise<string> {
    try {
      const escposData = generateTestTemplate();
      return Buffer.from(escposData, 'utf-8').toString('base64');
    } catch (error) {
      console.error('Error generating test print:', error);
      throw new HttpException(500, 'Internal server error while generating test print');
    }
  }

  /**
   * Generate transaction print data (dynamic data from transaction_id)
   */
  async generateTransactionPrint(transactionId: number): Promise<string> {
    const client = await db.connect();
    
    try {
      if (!transactionId || transactionId <= 0) {
        throw new HttpException(400, 'Valid transaction ID is required');
      }

      // Get transaction data from sale service
      const transaction = await this.saleService.findById(transactionId);
      
      if (!transaction) {
        throw new HttpException(404, 'Transaction not found');
      }

      // Get conversion prices for each item
      const itemsWithPrices = await Promise.all(
        transaction.items.map(async (item: any) => {
          const unitPrice = await SaleRepository.getConversionPrice(client, item.product_id, item.unit_id);
          return {
            ...item,
            unit_price: unitPrice
          };
        })
      );

      // Create transaction data with prices
      const transactionWithPrices: TransactionPrintData = {
        ...transaction,
        items: itemsWithPrices
      };

      // Generate ESC/POS template
      const escposData = generateTransactionTemplate(transactionWithPrices);
      return Buffer.from(escposData, 'utf-8').toString('base64');
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error generating transaction print:', error);
      throw new HttpException(500, 'Internal server error while generating transaction print');
    } finally {
      client.release();
    }
  }
}
