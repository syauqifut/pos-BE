import { Request, Response, NextFunction } from 'express';
import { AdjustmentService } from './adjustment.service';
import { HttpException } from '../../../exceptions/HttpException';
import { 
  createAdjustmentSchema, 
  updateAdjustmentSchema,
  adjustmentParamsSchema,
  CreateAdjustmentRequest,
  UpdateAdjustmentRequest,
  AdjustmentParamsRequest
} from './validators/adjustment.schema';

export class AdjustmentController {
  private adjustmentService: AdjustmentService;

  constructor() {
    this.adjustmentService = new AdjustmentService();
  }

  /**
   * Handle POST /transaction/adjustment
   * Create new adjustment transaction
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body with Zod
      const validatedData = createAdjustmentSchema.parse(req.body);

      // Get user ID from auth middleware
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new HttpException(401, 'User not authenticated');
      }

      const adjustment = await this.adjustmentService.create(validatedData, userId);

      res.status(201).json({
        success: true,
        message: 'Adjustment transaction created successfully',
        data: adjustment
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /transaction/adjustment/:id
   * Get adjustment transaction by ID
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = adjustmentParamsSchema.parse(req.params);

      const adjustment = await this.adjustmentService.findById(validatedParams.id);
      
      if (!adjustment) {
        throw new HttpException(404, 'Adjustment transaction not found');
      }

      res.status(200).json({
        success: true,
        message: 'Adjustment transaction retrieved successfully',
        data: adjustment
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle PUT /transaction/adjustment/:id
   * Update existing adjustment transaction
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = adjustmentParamsSchema.parse(req.params);
      
      // Validate request body with Zod
      const validatedData = updateAdjustmentSchema.parse(req.body);

      // Get user ID from auth middleware
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new HttpException(401, 'User not authenticated');
      }

      const adjustment = await this.adjustmentService.update(validatedParams.id, validatedData, userId);

      res.status(200).json({
        success: true,
        message: 'Adjustment transaction updated successfully',
        data: adjustment
      });
    } catch (error) {
      next(error);
    }
  };
} 