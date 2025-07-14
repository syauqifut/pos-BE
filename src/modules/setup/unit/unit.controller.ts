import { Request, Response, NextFunction } from 'express';
import { UnitService, CreateUnitRequest, UpdateUnitRequest } from './unit.service';
import { HttpException } from '../../../exceptions/HttpException';
import { validateRequiredFields } from '../../../utils/helpers';

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
      const { id } = req.params;
      const numericId = parseInt(id);

      if (isNaN(numericId)) {
        throw new HttpException(400, 'Invalid unit ID');
      }

      const unit = await this.unitService.findById(numericId);

      res.status(200).json({
        success: true,
        message: 'Unit retrieved successfully',
        data: unit
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle POST /setup/unit
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name }: CreateUnitRequest = req.body;

      // Validate required fields
      const { isValid, missingFields } = validateRequiredFields(req.body, ['name']);

      if (!isValid) {
        throw new HttpException(400, `Missing required fields: ${missingFields.join(', ')}`);
      }

      // Additional validation
      if (typeof name !== 'string' || name.trim() === '') {
        throw new HttpException(400, 'Name must be a non-empty string');
      }

      if (name.length > 255) {
        throw new HttpException(400, 'Name cannot exceed 255 characters');
      }

      const unit = await this.unitService.create({
        name: name.trim()
      });

      res.status(201).json({
        success: true,
        message: 'Unit created successfully',
        data: unit
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle PUT /setup/unit/:id
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { name }: UpdateUnitRequest = req.body;
      const numericId = parseInt(id);

      if (isNaN(numericId)) {
        throw new HttpException(400, 'Invalid unit ID');
      }

      // Validate required fields
      const { isValid, missingFields } = validateRequiredFields(req.body, ['name']);

      if (!isValid) {
        throw new HttpException(400, `Missing required fields: ${missingFields.join(', ')}`);
      }

      // Additional validation
      if (typeof name !== 'string' || name.trim() === '') {
        throw new HttpException(400, 'Name must be a non-empty string');
      }

      if (name.length > 255) {
        throw new HttpException(400, 'Name cannot exceed 255 characters');
      }

      const unit = await this.unitService.update(numericId, {
        name: name.trim()
      });

      res.status(200).json({
        success: true,
        message: 'Unit updated successfully',
        data: unit
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle DELETE /setup/unit/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const numericId = parseInt(id);

      if (isNaN(numericId)) {
        throw new HttpException(400, 'Invalid unit ID');
      }

      const unit = await this.unitService.delete(numericId);

      res.status(200).json({
        success: true,
        message: 'Unit deleted successfully',
        data: unit
      });
    } catch (error) {
      next(error);
    }
  };
} 