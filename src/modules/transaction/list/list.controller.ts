import { Request, Response, NextFunction } from 'express';
import { ListService } from './list.service';
import { transactionListQuerySchema, TransactionListQueryRequest } from './validators/list.schema';

export class ListController {
  private listService: ListService;

  constructor() {
    this.listService = new ListService();
  }

  /**
   * Handle GET /transaction/list
   * Get transactions with filtering, sorting, search, and pagination
   */
  getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate and parse query parameters with Zod
      const validatedQuery = transactionListQuerySchema.parse(req.query);

      const result = await this.listService.getTransactions(validatedQuery);

      res.status(200).json({
        success: true,
        message: 'Transactions retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  };
}
