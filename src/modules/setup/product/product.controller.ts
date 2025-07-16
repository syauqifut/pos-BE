import { Request, Response, NextFunction } from 'express';
import { ProductService, FindAllOptions } from './product.service';
import { HttpException } from '../../../exceptions/HttpException';
import { 
  createProductSchema, 
  updateProductSchema, 
  productQuerySchema, 
  productParamsSchema,
  CreateProductRequest,
  UpdateProductRequest
} from './validators/product.schema';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  /**
   * Handle GET /setup/product
   */
  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate query parameters with Zod
      const validatedQuery = productQuerySchema.parse(req.query);

      // Build options object
      const options: FindAllOptions = {};

      if (validatedQuery.search) {
        options.search = validatedQuery.search;
      }

      if (validatedQuery.category_id) {
        options.category_id = validatedQuery.category_id;
      }

      if (validatedQuery.manufacture_id) {
        options.manufacture_id = validatedQuery.manufacture_id;
      }

      if (validatedQuery.sort_by) {
        options.sort_by = validatedQuery.sort_by;
      }

      if (validatedQuery.sort_order) {
        options.sort_order = validatedQuery.sort_order as 'ASC' | 'DESC';
      }

      if (validatedQuery.page) {
        options.page = validatedQuery.page;
      }

      if (validatedQuery.limit) {
        options.limit = validatedQuery.limit;
      }

      const result = await this.productService.findAll(options);

      res.status(200).json({
        success: true,
        message: 'Products retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /setup/product/:id
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = productParamsSchema.parse(req.params);

      const product = await this.productService.findById(validatedParams.id);

      res.status(200).json({
        success: true,
        message: 'Product retrieved successfully',
        data: product
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle POST /setup/product
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body with Zod
      const validatedData = createProductSchema.parse(req.body);

      // Get user ID from auth middleware
      const userId = req.user?.userId;
      if (!userId) {
        throw new HttpException(401, 'User authentication required');
      }

      const product = await this.productService.create(validatedData, userId);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle PUT /setup/product/:id
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = productParamsSchema.parse(req.params);
      
      // Validate request body with Zod
      const validatedData = updateProductSchema.parse(req.body);

      // Get user ID from auth middleware
      const userId = req.user?.userId;
      if (!userId) {
        throw new HttpException(401, 'User authentication required');
      }

      const product = await this.productService.update(validatedParams.id, validatedData, userId);

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: product
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle DELETE /setup/product/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = productParamsSchema.parse(req.params);

      // Get user ID from auth middleware
      const userId = req.user?.userId;
      if (!userId) {
        throw new HttpException(401, 'User authentication required');
      }

      const product = await this.productService.delete(validatedParams.id, userId);

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
        data: product
      });
    } catch (error) {
      next(error);
    }
  };
} 