import { Request, Response, NextFunction } from 'express';
import { PrintService } from './print.service';
import { HttpException } from '../../exceptions/HttpException';

export class PrintController {
  private printService: PrintService;

  constructor() {
    this.printService = new PrintService();
  }

  /**
   * Handle GET /print/test
   * Generate test print data with static content
   */
  test = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const escposBase64 = await this.printService.generateTestPrint();
      
      res.status(200).json({
        success: true,
        message: 'Test print data generated successfully',
        data: {
          escpos: escposBase64,
          type: 'test'
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /print/sale/:transaction_id
   * Generate transaction print data with dynamic content
   */
  salePrint = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { transaction_id } = req.params;
      
      if (!transaction_id || isNaN(Number(transaction_id)) || Number(transaction_id) <= 0) {
        throw new HttpException(400, 'Valid transaction ID is required');
      }

      const escposBase64 = await this.printService.generateTransactionPrint(Number(transaction_id));
      
      res.status(200).json({
        success: true,
        message: 'Transaction print data generated successfully',
        data: {
          escpos: escposBase64,
          type: 'transaction',
          transaction_id: Number(transaction_id)
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
