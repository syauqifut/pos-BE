import { Request, Response, NextFunction } from 'express';
import { PurchaseService } from './purchase.service';
import { HttpException } from '../../../exceptions/HttpException';
import { 
  createPurchaseSchema, 
  updatePurchaseSchema,
  purchaseParamsSchema,
  CreatePurchaseRequest,
  UpdatePurchaseRequest,
  PurchaseParamsRequest
} from './validators/purchase.schema';

export class PurchaseController {
  private purchaseService: PurchaseService;

  constructor() {
    this.purchaseService = new PurchaseService();
  }

  /**
   * Handle POST /transaction/purchase
   * Create new purchase transaction
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body with Zod
      const validatedData = createPurchaseSchema.parse(req.body);

      // Get user ID from auth middleware
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new HttpException(401, 'User not authenticated');
      }

      const purchase = await this.purchaseService.create(validatedData, userId);

      res.status(201).json({
        success: true,
        message: 'Purchase transaction created successfully',
        data: purchase
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /transaction/purchase/:id
   * Get purchase transaction by ID
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = purchaseParamsSchema.parse(req.params);

      const purchase = await this.purchaseService.findById(validatedParams.id);
      
      if (!purchase) {
        throw new HttpException(404, 'Purchase transaction not found');
      }

      res.status(200).json({
        success: true,
        message: 'Purchase transaction retrieved successfully',
        data: purchase
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle PUT /transaction/purchase/:id
   * Update existing purchase transaction
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = purchaseParamsSchema.parse(req.params);
      
      // Validate request body with Zod
      const validatedData = updatePurchaseSchema.parse(req.body);

      // Get user ID from auth middleware
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new HttpException(401, 'User not authenticated');
      }

      const purchase = await this.purchaseService.update(validatedParams.id, validatedData, userId);

      res.status(200).json({
        success: true,
        message: 'Purchase transaction updated successfully',
        data: purchase
      });
    } catch (error) {
      next(error);
    }
  };
} 