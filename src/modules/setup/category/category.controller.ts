import { Request, Response, NextFunction } from 'express';
import { CategoryService, CreateCategoryRequest, UpdateCategoryRequest } from './category.service';
import { HttpException } from '../../../exceptions/HttpException';
import { validateRequiredFields } from '../../../utils/helpers';

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  /**
   * Handle GET /setup/category
   */
  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = await this.categoryService.findAll();

      res.status(200).json({
        success: true,
        message: 'Categories retrieved successfully',
        data: categories
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /setup/category/:id
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Validate ID parameter
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId <= 0) {
        throw new HttpException(400, 'Invalid category ID');
      }

      const category = await this.categoryService.findById(numericId);

      res.status(200).json({
        success: true,
        message: 'Category retrieved successfully',
        data: category
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle POST /setup/category
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name }: CreateCategoryRequest = req.body;

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
      const category = await this.categoryService.create({
        name: name.trim()
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle PUT /setup/category/:id
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { name }: UpdateCategoryRequest = req.body;

      // Validate ID parameter
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId <= 0) {
        throw new HttpException(400, 'Invalid category ID');
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
      const category = await this.categoryService.update(numericId, {
        name: name.trim()
      });

      res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle DELETE /setup/category/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Validate ID parameter
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId <= 0) {
        throw new HttpException(400, 'Invalid category ID');
      }

      // Call service
      const category = await this.categoryService.delete(numericId);

      res.status(200).json({
        success: true,
        message: 'Category deleted successfully',
        data: category
      });
    } catch (error) {
      next(error);
    }
  };
} 