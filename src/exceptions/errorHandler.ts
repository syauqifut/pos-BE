import { Request, Response, NextFunction } from 'express';
import { HttpException } from './HttpException';
import { ZodError } from 'zod';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error(`[${new Date().toISOString()}] - ${req.method} ${req.originalUrl}`);
  console.error(error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const firstError = error.issues[0];
    const message = firstError ? firstError.message : 'Validation error';
    
    res.status(400).json({
      success: false,
      statusCode: 400,
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        errors: error.issues,
        stack: error.stack ? error.stack.split('\n').filter((line: string) => line.trim()) : []
      })
    });
    return;
  }

  // Handle HttpException errors
  if (error instanceof HttpException) {
    res.status(error.statusCode).json({
      success: false,
      statusCode: error.statusCode,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack ? error.stack.split('\n').filter((line: string) => line.trim()) : []
      })
    });
    return;
  }

  // Handle PostgreSQL foreign key constraint errors
  if (error.code === '23503') {
    const constraintName = error.constraint;
    let readableMessage = 'Foreign key constraint violation';
    
    if (constraintName) {
      if (constraintName.includes('conversions_to_unit_id_fkey')) {
        readableMessage = 'Invalid Unit ID. Please ensure the selected unit is available in the system.';
      } else if (constraintName.includes('conversions_to_product_id_fkey')) {
        readableMessage = 'Invalid Product ID. Please ensure the selected product is available in the system.';
      } else if (constraintName.includes('_fkey')) {
        readableMessage = 'Invalid data selected. Please ensure all referenced data is available in the system.';
      }
    }
    
    res.status(400).json({
      success: false,
      statusCode: 400,
      message: readableMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        originalError: error.message,
        constraint: constraintName,
        stack: error.stack ? error.stack.split('\n').filter((line: string) => line.trim()) : []
      })
    });
    return;
  }

  // Handle PostgreSQL unique constraint errors
  if (error.code === '23505') {
    const constraintName = error.constraint;
    let readableMessage = 'Data already exists';
    
    if (constraintName) {
      if (constraintName.includes('conversions')) {
        readableMessage = 'Conversion with this combination of product, unit, and type already exists.';
      } else if (constraintName.includes('unique')) {
        readableMessage = 'Data with the same value already exists in the system.';
      }
    }
    
    res.status(409).json({
      success: false,
      statusCode: 409,
      message: readableMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        originalError: error.message,
        constraint: constraintName,
        stack: error.stack ? error.stack.split('\n').filter((line: string) => line.trim()) : []
      })
    });
    return;
  }

  // Handle PostgreSQL check constraint errors
  if (error.code === '23514') {
    const constraintName = error.constraint;
    let readableMessage = 'Data does not meet requirements';
    
    if (constraintName) {
      if (constraintName.includes('chk_default_type')) {
        readableMessage = 'Conversion type must be "purchase" or "sale" to be set as default.';
      } else if (constraintName.includes('check')) {
        readableMessage = 'Data does not meet the specified requirements.';
      }
    }
    
    res.status(400).json({
      success: false,
      statusCode: 400,
      message: readableMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        originalError: error.message,
        constraint: constraintName,
        stack: error.stack ? error.stack.split('\n').filter((line: string) => line.trim()) : []
      })
    });
    return;
  }

  // Handle other errors
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack ? error.stack.split('\n').filter((line: string) => line.trim()) : []
    })
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new HttpException(404, `Route ${req.originalUrl} not found`);
  next(error);
}; 