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