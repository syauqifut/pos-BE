import { Request, Response, NextFunction } from 'express';
import { HttpException } from '../exceptions/HttpException';
import { verifyToken, JwtPayload } from '../utils/helpers';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new HttpException(401, 'Access token is required');
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof HttpException) {
      next(error);
    } else {
      next(new HttpException(401, 'Invalid or expired token'));
    }
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new HttpException(401, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new HttpException(403, 'Insufficient permissions');
    }

    next();
  };
}; 