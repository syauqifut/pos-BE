import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { HttpException } from '../../../exceptions/HttpException';
import { 
  createUserSchema, 
  updateUserSchema, 
  userParamsSchema,
  CreateUserRequest,
  UpdateUserRequest
} from './validators/user.schema';

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
      // Validate path parameters with Zod
      const validatedParams = userParamsSchema.parse(req.params);

      const user = await this.userService.findActiveById(validatedParams.id);

      res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: user
      });
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as any;
        throw new HttpException(400, zodError.issues[0]?.message || 'Validation error');
      }
      next(error);
    }
  };

  /**
   * Handle POST /setup/user
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body with Zod
      const validatedData = createUserSchema.parse(req.body);

      // Call service
      const user = await this.userService.create(validatedData);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user
      });
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as any;
        throw new HttpException(400, zodError.issues[0]?.message || 'Validation error');
      }
      next(error);
    }
  };

  /**
   * Handle PUT /setup/user/:id
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = userParamsSchema.parse(req.params);
      
      // Validate request body with Zod
      const validatedData = updateUserSchema.parse(req.body);

      // Call service
      const user = await this.userService.update(validatedParams.id, validatedData);

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user
      });
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as any;
        throw new HttpException(400, zodError.issues[0]?.message || 'Validation error');
      }
      next(error);
    }
  };

  /**
   * Handle DELETE /setup/user/:id
   */
  softDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = userParamsSchema.parse(req.params);

      // Call service
      const user = await this.userService.softDelete(validatedParams.id);

      res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
        data: user
      });
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as any;
        throw new HttpException(400, zodError.issues[0]?.message || 'Validation error');
      }
      next(error);
    }
  };

  /**
   * Handle PATCH /setup/user/:id/toggle
   */
  toggleActivation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate path parameters with Zod
      const validatedParams = userParamsSchema.parse(req.params);

      // Call service
      const user = await this.userService.toggleActivation(validatedParams.id);

      res.status(200).json({
        success: true,
        message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully`,
        data: user
      });
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as any;
        throw new HttpException(400, zodError.issues[0]?.message || 'Validation error');
      }
      next(error);
    }
  };
} 