import { Request, Response, NextFunction } from 'express';
import { UnitService } from './unit.service';
import { HttpException } from '../../../exceptions/HttpException';
import { 
  createUnitSchema, 
  updateUnitSchema, 
  unitParamsSchema,
  CreateUnitRequest,
  UpdateUnitRequest
} from './validators/unit.schema';

export class UnitController {
  private unitService: UnitService;

  constructor() {
    this.unitService = new UnitService();
  }

  /**
   * Handle GET /setup/unit
   */
  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const units = await this.unitService.findAll();

      res.status(200).json({
        success: true,
        message: 'Units retrieved successfully',
        data: units
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /setup/unit/:id
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = unitParamsSchema.parse(req.params);

      const unit = await this.unitService.findById(validatedParams.id);

      res.status(200).json({
        success: true,
        message: 'Unit retrieved successfully',
        data: unit
      });
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as any;
        throw new HttpException(400, zodError.issues[0]?.message || 'Validation error');
      }
      next(error);
    }
  };

  /**
   * Handle POST /setup/unit
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body with Zod
      const validatedData = createUnitSchema.parse(req.body);

      const unit = await this.unitService.create(validatedData);

      res.status(201).json({
        success: true,
        message: 'Unit created successfully',
        data: unit
      });
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as any;
        throw new HttpException(400, zodError.issues[0]?.message || 'Validation error');
      }
      next(error);
    }
  };

  /**
   * Handle PUT /setup/unit/:id
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = unitParamsSchema.parse(req.params);
      
      // Validate request body with Zod
      const validatedData = updateUnitSchema.parse(req.body);

      const unit = await this.unitService.update(validatedParams.id, validatedData);

      res.status(200).json({
        success: true,
        message: 'Unit updated successfully',
        data: unit
      });
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as any;
        throw new HttpException(400, zodError.issues[0]?.message || 'Validation error');
      }
      next(error);
    }
  };

  /**
   * Handle DELETE /setup/unit/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = unitParamsSchema.parse(req.params);

      const unit = await this.unitService.delete(validatedParams.id);

      res.status(200).json({
        success: true,
        message: 'Unit deleted successfully',
        data: unit
      });
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as any;
        throw new HttpException(400, zodError.issues[0]?.message || 'Validation error');
      }
      next(error);
    }
  };
} 