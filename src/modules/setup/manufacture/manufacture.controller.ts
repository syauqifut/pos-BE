import { Request, Response, NextFunction } from 'express';
import { ManufactureService, CreateManufactureRequest, UpdateManufactureRequest } from './manufacture.service';
import { HttpException } from '../../../exceptions/HttpException';
import { validateRequiredFields } from '../../../utils/helpers';

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
      const { id } = req.params;
      
      // Validate ID parameter
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId <= 0) {
        throw new HttpException(400, 'Invalid manufacture ID');
      }

      const manufacture = await this.manufactureService.findById(numericId);

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
      const { name }: CreateManufactureRequest = req.body;

      // Validate required fields
      const { isValid, missingFields } = validateRequiredFields(req.body, ['name']);

      if (!isValid) {
        throw new HttpException(400, `Missing required fields: ${missingFields.join(', ')}`);
      }

      // Additional validation
      if (typeof name !== 'string') {
        throw new HttpException(400, 'Name must be a string');
      }

      if (name.trim().length === 0) {
        throw new HttpException(400, 'Name cannot be empty');
      }

      if (name.trim().length > 255) {
        throw new HttpException(400, 'Name cannot exceed 255 characters');
      }

      // Call service
      const manufacture = await this.manufactureService.create({
        name: name.trim()
      });

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
      const { id } = req.params;
      const { name }: UpdateManufactureRequest = req.body;

      // Validate ID parameter
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId <= 0) {
        throw new HttpException(400, 'Invalid manufacture ID');
      }

      // Validate required fields
      const { isValid, missingFields } = validateRequiredFields(req.body, ['name']);

      if (!isValid) {
        throw new HttpException(400, `Missing required fields: ${missingFields.join(', ')}`);
      }

      // Additional validation
      if (typeof name !== 'string') {
        throw new HttpException(400, 'Name must be a string');
      }

      if (name.trim().length === 0) {
        throw new HttpException(400, 'Name cannot be empty');
      }

      if (name.trim().length > 255) {
        throw new HttpException(400, 'Name cannot exceed 255 characters');
      }

      // Call service
      const manufacture = await this.manufactureService.update(numericId, {
        name: name.trim()
      });

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
      const { id } = req.params;

      // Validate ID parameter
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId <= 0) {
        throw new HttpException(400, 'Invalid manufacture ID');
      }

      // Call service
      const manufacture = await this.manufactureService.delete(numericId);

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