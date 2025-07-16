import { Request, Response, NextFunction } from 'express';
import { SaleService } from './sale.service';
import { HttpException } from '../../../exceptions/HttpException';
import { 
  createSaleSchema, 
  updateSaleSchema,
  saleParamsSchema,
  CreateSaleRequest,
  UpdateSaleRequest,
  SaleParamsRequest
} from './validators/sale.schema';

export class SaleController {
  private saleService: SaleService;

  constructor() {
    this.saleService = new SaleService();
  }

  /**
   * Handle POST /transaction/sale
   * Create new sale transaction
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body with Zod
      const validatedData = createSaleSchema.parse(req.body);

      // Get user ID from auth middleware
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new HttpException(401, 'User not authenticated');
      }

      const sale = await this.saleService.create(validatedData, userId);

      res.status(201).json({
        success: true,
        message: 'Sale transaction created successfully',
        data: sale
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /transaction/sale/:id
   * Get sale transaction by ID
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = saleParamsSchema.parse(req.params);

      const sale = await this.saleService.findById(validatedParams.id);
      
      if (!sale) {
        throw new HttpException(404, 'Sale transaction not found');
      }

      res.status(200).json({
        success: true,
        message: 'Sale transaction retrieved successfully',
        data: sale
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle PUT /transaction/sale/:id
   * Update existing sale transaction
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = saleParamsSchema.parse(req.params);
      
      // Validate request body with Zod
      const validatedData = updateSaleSchema.parse(req.body);

      // Get user ID from auth middleware
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new HttpException(401, 'User not authenticated');
      }

      const sale = await this.saleService.update(validatedParams.id, validatedData, userId);

      res.status(200).json({
        success: true,
        message: 'Sale transaction updated successfully',
        data: sale
      });
    } catch (error) {
      next(error);
    }
  };
} 