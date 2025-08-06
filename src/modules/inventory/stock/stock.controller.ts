import { Request, Response, NextFunction } from 'express';
import { StockService, FindAllStockOptions } from './stock.service';
import { 
  stockQuerySchema, 
  productParamsSchema, 
  stockHistoryQuerySchema 
} from './validators/stock.schema';

export class StockController {
  private stockService: StockService;

  constructor() {
    this.stockService = new StockService();
  }

  /**
   * Handle GET /inventory/stock
   */
  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate query parameters with Zod
      const validatedQuery = stockQuerySchema.parse(req.query);

      // Build options object
      const options: FindAllStockOptions = {};

      if (validatedQuery.search) {
        options.search = validatedQuery.search;
      }

      if (validatedQuery.category_id) {
        options.category_id = validatedQuery.category_id;
      }

      if (validatedQuery.manufacturer_id) {
        options.manufacturer_id = validatedQuery.manufacturer_id;
      }

      if (validatedQuery.sort_by) {
        options.sort_by = validatedQuery.sort_by;
      }

      if (validatedQuery.sort_order) {
        options.sort_order = validatedQuery.sort_order as 'ASC' | 'DESC';
      }

      if (validatedQuery.page) {
        options.page = validatedQuery.page;
      }

      if (validatedQuery.limit) {
        options.limit = validatedQuery.limit;
      }

      const result = await this.stockService.findAll(options);

      res.status(200).json({
        success: true,
        message: 'Stock information retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  };


  /**
   * Handle GET /inventory/stock/:productId
   */
  getCurrentStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedParams = productParamsSchema.parse(req.params);

      const result = await this.stockService.getCurrentStock(validatedParams.productId);

      res.status(200).json({
        success: true,
        message: 'Current stock retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /inventory/stock/:productId
   */
  getStockHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = productParamsSchema.parse(req.params);
      
      // Validate query parameters with Zod
      const validatedQuery = stockHistoryQuerySchema.parse(req.query);

      const result = await this.stockService.getStockHistory(
        validatedParams.productId,
        validatedQuery.page,
        validatedQuery.limit
      );

      res.status(200).json({
        success: true,
        message: 'Stock history retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /inventory/stock/product
   */
  getAllProductWithStockResult = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedQuery = stockQuerySchema.parse(req.query);

      const options: FindAllStockOptions = {};

      if (validatedQuery.search) {
        options.search = validatedQuery.search;
      }

      if (validatedQuery.category_id) {
        options.category_id = validatedQuery.category_id;
      }

      if (validatedQuery.manufacturer_id) {
        options.manufacturer_id = validatedQuery.manufacturer_id;
      }

      const result = await this.stockService.getAllProductWithStockResult(options);

      res.status(200).json({
        success: true,
        message: 'All product with stock result retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
} 