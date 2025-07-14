import { Request, Response, NextFunction } from 'express';
import { UserService, CreateUserRequest, UpdateUserRequest } from './user.service';
import { HttpException } from '../../../exceptions/HttpException';
import { validateRequiredFields } from '../../../utils/helpers';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Handle GET /setup/user
   */
  findAllActive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await this.userService.findAllActive();

      res.status(200).json({
        success: true,
        message: 'Active users retrieved successfully',
        data: users
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /setup/user/inactive
   */
  findAllInactive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await this.userService.findAllInactive();

      res.status(200).json({
        success: true,
        message: 'Inactive users retrieved successfully',
        data: users
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle GET /setup/user/:id
   */
  findActiveById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Validate ID parameter
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId <= 0) {
        throw new HttpException(400, 'Invalid user ID');
      }

      const user = await this.userService.findActiveById(numericId);

      res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle POST /setup/user
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, username, password, role }: CreateUserRequest = req.body;

      // Validate required fields
      const { isValid, missingFields } = validateRequiredFields(req.body, ['name', 'username', 'password', 'role']);

      if (!isValid) {
        throw new HttpException(400, `Missing required fields: ${missingFields.join(', ')}`);
      }

      // Additional validation
      if (typeof name !== 'string' || typeof username !== 'string' || typeof password !== 'string' || typeof role !== 'string') {
        throw new HttpException(400, 'All fields must be strings');
      }

      if (name.trim().length === 0) {
        throw new HttpException(400, 'Name cannot be empty');
      }

      if (username.trim().length === 0) {
        throw new HttpException(400, 'Username cannot be empty');
      }

      if (password.length < 3) {
        throw new HttpException(400, 'Password must be at least 3 characters long');
      }

      if (!['admin', 'kasir'].includes(role)) {
        throw new HttpException(400, 'Role must be either "admin" or "kasir"');
      }

      if (name.trim().length > 100) {
        throw new HttpException(400, 'Name cannot exceed 100 characters');
      }

      if (username.trim().length > 50) {
        throw new HttpException(400, 'Username cannot exceed 50 characters');
      }

      // Call service
      const user = await this.userService.create({
        name: name.trim(),
        username: username.trim(),
        password,
        role: role as 'admin' | 'kasir'
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle PUT /setup/user/:id
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, username, password, role }: UpdateUserRequest = req.body;

      // Validate ID parameter
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId <= 0) {
        throw new HttpException(400, 'Invalid user ID');
      }

      // Validate required fields (password is optional for updates)
      const { isValid, missingFields } = validateRequiredFields(req.body, ['name', 'username', 'role']);

      if (!isValid) {
        throw new HttpException(400, `Missing required fields: ${missingFields.join(', ')}`);
      }

      // Additional validation
      if (typeof name !== 'string' || typeof username !== 'string' || typeof role !== 'string') {
        throw new HttpException(400, 'Name, username, and role must be strings');
      }

      if (password !== undefined && typeof password !== 'string') {
        throw new HttpException(400, 'Password must be a string');
      }

      if (name.trim().length === 0) {
        throw new HttpException(400, 'Name cannot be empty');
      }

      if (username.trim().length === 0) {
        throw new HttpException(400, 'Username cannot be empty');
      }

      if (password && password.length < 3) {
        throw new HttpException(400, 'Password must be at least 3 characters long');
      }

      if (!['admin', 'kasir'].includes(role)) {
        throw new HttpException(400, 'Role must be either "admin" or "kasir"');
      }

      if (name.trim().length > 100) {
        throw new HttpException(400, 'Name cannot exceed 100 characters');
      }

      if (username.trim().length > 50) {
        throw new HttpException(400, 'Username cannot exceed 50 characters');
      }

      // Call service
      const user = await this.userService.update(numericId, {
        name: name.trim(),
        username: username.trim(),
        password,
        role: role as 'admin' | 'kasir'
      });

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle DELETE /setup/user/:id
   */
  softDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Validate ID parameter
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId <= 0) {
        throw new HttpException(400, 'Invalid user ID');
      }

      // Call service
      const user = await this.userService.softDelete(numericId);

      res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle PATCH /setup/user/:id/toggle
   */
  toggleActivation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Validate ID parameter
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId <= 0) {
        throw new HttpException(400, 'Invalid user ID');
      }

      // Call service
      const user = await this.userService.toggleActivation(numericId);

      res.status(200).json({
        success: true,
        message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully`,
        data: user
      });
    } catch (error) {
      next(error);
    }
  };
} 