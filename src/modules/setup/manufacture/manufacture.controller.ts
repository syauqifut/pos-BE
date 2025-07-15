import { Request, Response, NextFunction } from 'express';
import { ManufactureService } from './manufacture.service';
import { HttpException } from '../../../exceptions/HttpException';
import { 
  createManufactureSchema, 
  updateManufactureSchema, 
  manufactureParamsSchema,
  CreateManufactureRequest,
  UpdateManufactureRequest
} from './validators/manufacture.schema';

export class ManufactureController {
  private manufactureService: ManufactureService;

  constructor() {
    this.manufactureService = new ManufactureService();
  }

  /**
   * Handle GET /setup/manufacture
   */
  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const manufactures = await this.manufactureService.findAll();

      res.status(200).json({
        success: true,
        message: 'Manufactures retrieved successfully',
        data: manufactures
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /setup/manufacture/:id
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = manufactureParamsSchema.parse(req.params);

      const manufacture = await this.manufactureService.findById(validatedParams.id);

      res.status(200).json({
        success: true,
        message: 'Manufacture retrieved successfully',
        data: manufacture
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle POST /setup/manufacture
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body with Zod
      const validatedData = createManufactureSchema.parse(req.body);

      // Call service
      const manufacture = await this.manufactureService.create(validatedData);

      res.status(201).json({
        success: true,
        message: 'Manufacture created successfully',
        data: manufacture
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle PUT /setup/manufacture/:id
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = manufactureParamsSchema.parse(req.params);
      
      // Validate request body with Zod
      const validatedData = updateManufactureSchema.parse(req.body);

      // Call service
      const manufacture = await this.manufactureService.update(validatedParams.id, validatedData);

      res.status(200).json({
        success: true,
        message: 'Manufacture updated successfully',
        data: manufacture
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle DELETE /setup/manufacture/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = manufactureParamsSchema.parse(req.params);

      // Call service
      const manufacture = await this.manufactureService.delete(validatedParams.id);

      res.status(200).json({
        success: true,
        message: 'Manufacture deleted successfully',
        data: manufacture
      });
    } catch (error) {
      next(error);
    }
  };
} 