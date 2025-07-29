import { Request, Response, NextFunction } from 'express';
import { ManufacturerService } from './manufacturer.service';
import { HttpException } from '../../../exceptions/HttpException';
import { 
  createManufacturerSchema, 
  updateManufacturerSchema, 
  manufacturerParamsSchema,
  manufacturerQuerySchema,
  CreateManufacturerRequest,
  UpdateManufacturerRequest,
  ManufacturerQueryRequest
} from './validators/manufacturer.schema';

export class ManufacturerController {
  private manufacturerService: ManufacturerService;

  constructor() {
    this.manufacturerService = new ManufacturerService();
  }

  /**
   * Handle GET /setup/manufacturer
   */
  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate query parameters with Zod
      const validatedQuery = manufacturerQuerySchema.parse(req.query);
      
      const manufacturers = await this.manufacturerService.findAll(validatedQuery);

      res.status(200).json({
        success: true,
        message: 'Manufacturers retrieved successfully',
        data: manufacturers
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /setup/manufacturer/:id
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = manufacturerParamsSchema.parse(req.params);

      const manufacturer = await this.manufacturerService.findById(validatedParams.id);

      res.status(200).json({
        success: true,
        message: 'Manufacturer retrieved successfully',
        data: manufacturer
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle POST /setup/manufacturer
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body with Zod
      const validatedData = createManufacturerSchema.parse(req.body);

      // Call service
      const manufacturer = await this.manufacturerService.create(validatedData);

      res.status(201).json({
        success: true,
        message: 'Manufacturer created successfully',
        data: manufacturer
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle PUT /setup/manufacturer/:id
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = manufacturerParamsSchema.parse(req.params);
      
      // Validate request body with Zod
      const validatedData = updateManufacturerSchema.parse(req.body);

      // Call service
      const manufacturer = await this.manufacturerService.update(validatedParams.id, validatedData);

      res.status(200).json({
        success: true,
        message: 'Manufacturer updated successfully',
        data: manufacturer
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle DELETE /setup/manufacturer/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = manufacturerParamsSchema.parse(req.params);

      // Call service
      const manufacturer = await this.manufacturerService.delete(validatedParams.id);

      res.status(200).json({
        success: true,
        message: 'Manufacturer deleted successfully',
        data: manufacturer
      });
    } catch (error) {
      next(error);
    }
  };
} 