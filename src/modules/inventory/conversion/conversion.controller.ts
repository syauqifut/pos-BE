import { Request, Response, NextFunction } from 'express';
import { ConversionService } from './conversion.service';
import { CreateConversionData, UpdateConversionData } from './conversion.repository';
import { HttpException } from '../../../exceptions/HttpException';
import { 
  createConversionSchema, 
  updateConversionSchema, 
  conversionParamsSchema,
  productParamsSchema,
  CreateConversionRequest,
  UpdateConversionRequest,
  ProductParamsRequest,
  productAndTypeParamsSchema
} from './validators/conversion.schema';

export class ConversionController {
  private conversionService: ConversionService;

  constructor() {
    this.conversionService = new ConversionService();
  }

  /**
   * Handle POST /inventory/conversion
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body with Zod
      const validatedData: CreateConversionRequest = createConversionSchema.parse(req.body);

      // Get user ID from auth middleware (if available)
      const userId = (req as any).user?.id;

      // Prepare data for service
      const createData: CreateConversionData = {
        ...validatedData,
        created_by: userId
      };

      // Create the conversion
      const conversion = await this.conversionService.create(createData);

      res.status(201).json({
        success: true,
        message: 'Conversion created successfully',
        data: conversion
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /inventory/conversion
   */
  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversions = await this.conversionService.findAll();

      res.status(200).json({
        success: true,
        message: 'Conversions retrieved successfully',
        data: conversions
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle PUT /inventory/conversion/:id
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate parameters
      const { id } = conversionParamsSchema.parse(req.params);

      // Validate request body with Zod
      const validatedData: UpdateConversionRequest = updateConversionSchema.parse(req.body);

      // Get user ID from auth middleware (if available)
      const userId = (req as any).user?.id;

      // Prepare data for service
      const updateData: UpdateConversionData = {
        ...validatedData,
        updated_by: userId
      };

      // Update the conversion
      const conversion = await this.conversionService.update(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Conversion updated successfully',
        data: conversion
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /inventory/conversion/:id
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate parameters
      const { id } = conversionParamsSchema.parse(req.params);

      // Get the conversion
      const conversion = await this.conversionService.findById(id);

      res.status(200).json({
        success: true,
        message: 'Conversion retrieved successfully',
        data: conversion
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle DELETE /inventory/conversion/:id
   */
  deleteById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = conversionParamsSchema.parse(req.params);

      // Delete the conversion
      await this.conversionService.deleteById(id);

      res.status(200).json({
        success: true,
        message: 'Conversion deleted successfully'
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /inventory/conversion/detail/:productId
   */
  getProductConversionDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate parameters
      const { productId } = productParamsSchema.parse(req.params);

      // Get the product conversion details
      const conversionDetail = await this.conversionService.getProductConversionDetail(productId);

      res.status(200).json({
        success: true,
        message: 'Product conversion details retrieved successfully',
        data: conversionDetail
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /inventory/conversion/:productId/:type
   */
  getConversionsByProductAndType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productId, type } = productAndTypeParamsSchema.parse(req.params);

      const result = await this.conversionService.getConversionsByProductAndType(productId, type);

      res.status(200).json({
        success: true,
        message: 'Product conversions retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /inventory/conversion/default/:productId
   */
  getDefaultConversionByProductId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productId } = productParamsSchema.parse(req.params);

      const result = await this.conversionService.getDefaultConversionByProductId(productId);

      res.status(200).json({
        success: true,
        message: 'Default conversion retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}