import { Request, Response, NextFunction } from 'express';
import { AuthService, LoginRequest } from './auth.service';
import { HttpException } from '../../exceptions/HttpException';
import { validateRequiredFields } from '../../utils/helpers';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Handle POST /auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password }: LoginRequest = req.body;

      // Validate required fields
      const { isValid, missingFields } = validateRequiredFields(req.body, ['username', 'password']);

      if (!isValid) {
        throw new HttpException(400, `Missing required fields: ${missingFields.join(', ')}`);
      }

      // Additional validation
      if (typeof username !== 'string' || typeof password !== 'string') {
        throw new HttpException(400, 'Username and password must be strings');
      }

      if (username.trim().length === 0) {
        throw new HttpException(400, 'Username cannot be empty');
      }

      if (password.length < 3) {
        throw new HttpException(400, 'Password must be at least 3 characters long');
      }

      // Call service
      const result = await this.authService.login({
        username: username.trim(),
        password
      });

      // Send successful response
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /auth/verify (optional endpoint to verify token)
   */
  verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // User is already attached to req by auth middleware
      if (!req.user) {
        throw new HttpException(401, 'No user found in request');
      }

      // Optionally verify user still exists in database
      const userExists = await this.authService.verifyUserExists(req.user.userId);
      
      if (!userExists) {
        throw new HttpException(401, 'User account no longer exists');
      }

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        user: req.user
      });
    } catch (error) {
      next(error);
    }
  };
} 