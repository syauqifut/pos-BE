import { Request, Response, NextFunction } from 'express';
import { ProductService, CreateProductRequest, UpdateProductRequest, FindAllOptions } from './product.service';
import { HttpException } from '../../../exceptions/HttpException';
import { validateRequiredFields } from '../../../utils/helpers';

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
      // Parse query parameters
      const {
        search,
        category_id,
        unit_id,
        manufacture_id,
        sort_by,
        sort_order,
        page,
        limit
      } = req.query;

      // Build options object
      const options: FindAllOptions = {};

      if (search && typeof search === 'string') {
        options.search = search;
      }

      if (category_id) {
        const categoryId = parseInt(category_id as string);
        if (isNaN(categoryId)) {
          throw new HttpException(400, 'category_id must be a valid number');
        }
        options.category_id = categoryId;
      }

      if (unit_id) {
        const unitId = parseInt(unit_id as string);
        if (isNaN(unitId)) {
          throw new HttpException(400, 'unit_id must be a valid number');
        }
        options.unit_id = unitId;
      }

      if (manufacture_id) {
        const manufactureId = parseInt(manufacture_id as string);
        if (isNaN(manufactureId)) {
          throw new HttpException(400, 'manufacture_id must be a valid number');
        }
        options.manufacture_id = manufactureId;
      }

      if (sort_by && typeof sort_by === 'string') {
        options.sort_by = sort_by;
      }

      if (sort_order && typeof sort_order === 'string') {
        if (!['ASC', 'DESC'].includes(sort_order.toUpperCase())) {
          throw new HttpException(400, 'sort_order must be ASC or DESC');
        }
        options.sort_order = sort_order.toUpperCase() as 'ASC' | 'DESC';
      }

      if (page) {
        const pageNum = parseInt(page as string);
        if (isNaN(pageNum) || pageNum < 1) {
          throw new HttpException(400, 'page must be a positive number');
        }
        options.page = pageNum;
      }

      if (limit) {
        const limitNum = parseInt(limit as string);
        if (isNaN(limitNum) || limitNum < 1) {
          throw new HttpException(400, 'limit must be a positive number');
        }
        options.limit = limitNum;
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
      const { id } = req.params;
      const productId = parseInt(id);

      if (isNaN(productId)) {
        throw new HttpException(400, 'Invalid product ID');
      }

      const product = await this.productService.findById(productId);

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
      const {
        name,
        description,
        sku,
        barcode,
        image_url,
        category_id,
        manufacture_id,
        unit_id
      }: CreateProductRequest = req.body;

      // Validate required fields
      const { isValid, missingFields } = validateRequiredFields(req.body, ['name']);

      if (!isValid) {
        throw new HttpException(400, `Missing required fields: ${missingFields.join(', ')}`);
      }

      // Additional validation
      if (typeof name !== 'string' || name.trim() === '') {
        throw new HttpException(400, 'Name must be a non-empty string');
      }

      if (description !== undefined && typeof description !== 'string') {
        throw new HttpException(400, 'Description must be a string');
      }

      if (sku !== undefined && typeof sku !== 'string') {
        throw new HttpException(400, 'SKU must be a string');
      }

      if (barcode !== undefined && typeof barcode !== 'string') {
        throw new HttpException(400, 'Barcode must be a string');
      }

      if (image_url !== undefined && typeof image_url !== 'string') {
        throw new HttpException(400, 'Image URL must be a string');
      }

      if (category_id !== undefined && (typeof category_id !== 'number' || category_id <= 0)) {
        throw new HttpException(400, 'Category ID must be a positive number');
      }

      if (manufacture_id !== undefined && (typeof manufacture_id !== 'number' || manufacture_id <= 0)) {
        throw new HttpException(400, 'Manufacture ID must be a positive number');
      }

      if (unit_id !== undefined && (typeof unit_id !== 'number' || unit_id <= 0)) {
        throw new HttpException(400, 'Unit ID must be a positive number');
      }

      // Get user ID from auth middleware
      const userId = req.user?.userId;
      if (!userId) {
        throw new HttpException(401, 'User authentication required');
      }

      const product = await this.productService.create({
        name: name.trim(),
        description: description?.trim(),
        sku: sku?.trim(),
        barcode: barcode?.trim(),
        image_url: image_url?.trim(),
        category_id,
        manufacture_id,
        unit_id
      }, userId);

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
      const { id } = req.params;
      const productId = parseInt(id);

      if (isNaN(productId)) {
        throw new HttpException(400, 'Invalid product ID');
      }

      const {
        name,
        description,
        sku,
        barcode,
        image_url,
        category_id,
        manufacture_id,
        unit_id
      }: UpdateProductRequest = req.body;

      // Validation for provided fields
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim() === '') {
          throw new HttpException(400, 'Name must be a non-empty string');
        }
      }

      if (description !== undefined && typeof description !== 'string') {
        throw new HttpException(400, 'Description must be a string');
      }

      if (sku !== undefined && typeof sku !== 'string') {
        throw new HttpException(400, 'SKU must be a string');
      }

      if (barcode !== undefined && typeof barcode !== 'string') {
        throw new HttpException(400, 'Barcode must be a string');
      }

      if (image_url !== undefined && typeof image_url !== 'string') {
        throw new HttpException(400, 'Image URL must be a string');
      }

      if (category_id !== undefined && (typeof category_id !== 'number' || category_id <= 0)) {
        throw new HttpException(400, 'Category ID must be a positive number');
      }

      if (manufacture_id !== undefined && (typeof manufacture_id !== 'number' || manufacture_id <= 0)) {
        throw new HttpException(400, 'Manufacture ID must be a positive number');
      }

      if (unit_id !== undefined && (typeof unit_id !== 'number' || unit_id <= 0)) {
        throw new HttpException(400, 'Unit ID must be a positive number');
      }

      // Get user ID from auth middleware
      const userId = req.user?.userId;
      if (!userId) {
        throw new HttpException(401, 'User authentication required');
      }

      const updateData: UpdateProductRequest = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description.trim();
      if (sku !== undefined) updateData.sku = sku.trim();
      if (barcode !== undefined) updateData.barcode = barcode.trim();
      if (image_url !== undefined) updateData.image_url = image_url.trim();
      if (category_id !== undefined) updateData.category_id = category_id;
      if (manufacture_id !== undefined) updateData.manufacture_id = manufacture_id;
      if (unit_id !== undefined) updateData.unit_id = unit_id;

      const product = await this.productService.update(productId, updateData, userId);

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
      const { id } = req.params;
      const productId = parseInt(id);

      if (isNaN(productId)) {
        throw new HttpException(400, 'Invalid product ID');
      }

      // Get user ID from auth middleware
      const userId = req.user?.userId;
      if (!userId) {
        throw new HttpException(401, 'User authentication required');
      }

      const product = await this.productService.delete(productId, userId);

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