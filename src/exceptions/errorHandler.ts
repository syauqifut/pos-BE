import { Request, Response, NextFunction } from 'express';
import { HttpException } from './HttpException';

export const errorHandler = (
  error: HttpException,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  console.error(`[${new Date().toISOString()}] ${statusCode} - ${message}`);
  console.error('Stack:', error.stack);

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack ? error.stack.split('\n').filter(line => line.trim()) : []
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