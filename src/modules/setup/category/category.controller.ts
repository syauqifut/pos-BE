import { Request, Response, NextFunction } from 'express';
import { CategoryService } from './category.service';
import { HttpException } from '../../../exceptions/HttpException';
import { 
  createCategorySchema, 
  updateCategorySchema, 
  categoryParamsSchema,
  categoryQuerySchema,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryQueryRequest
} from './validators/category.schema';

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
      // Validate query parameters with Zod
      const validatedQuery = categoryQuerySchema.parse(req.query);
      
      const categories = await this.categoryService.findAll(validatedQuery);

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
      // Validate path parameters with Zod
      const validatedParams = categoryParamsSchema.parse(req.params);

      const category = await this.categoryService.findById(validatedParams.id);

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
      // Validate request body with Zod
      const validatedData = createCategorySchema.parse(req.body);

      // Call service
      const category = await this.categoryService.create(validatedData);

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
      // Validate path parameters with Zod
      const validatedParams = categoryParamsSchema.parse(req.params);
      
      // Validate request body with Zod
      const validatedData = updateCategorySchema.parse(req.body);

      // Call service
      const category = await this.categoryService.update(validatedParams.id, validatedData);

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
      // Validate path parameters with Zod
      const validatedParams = categoryParamsSchema.parse(req.params);

      // Call service
      const category = await this.categoryService.delete(validatedParams.id);

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