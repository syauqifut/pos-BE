import bcrypt from 'bcryptjs';
import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { UserRepository, User, CreateUserData, UpdateUserData } from './user.repository';

export interface CreateUserRequest {
  name: string;
  username: string;
  password: string;
  role: 'admin' | 'kasir';
}

export interface UpdateUserRequest {
  name: string;
  username: string;
  password?: string;
  role: 'admin' | 'kasir';
}

export interface FindAllOptions {
  search?: string;
  sort_by?: 'name' | 'username' | 'id';
  sort_order?: string;
}

export class UserService {
  /**
   * Get all active users with search and sort
   */
  async findAllActive(options: FindAllOptions = {}): Promise<User[]> {
    try {
      const { search, sort_by = 'name', sort_order = 'ASC' } = options;
      
      let whereClause = 'WHERE is_active = true';
      const values: any[] = [];
      let paramCount = 0;

      // Add search condition if provided
      if (search) {
        paramCount++;
        whereClause += ` AND (name ILIKE $${paramCount} OR username ILIKE $${paramCount})`;
        values.push(`%${search}%`);
      }

      // Build ORDER BY clause
      const orderColumn = sort_by === 'id' ? 'id' : sort_by === 'username' ? 'username' : 'name';
      const orderClause = `ORDER BY ${orderColumn} ${sort_order}`;

      return await UserRepository.findAllActive(pool, whereClause, values, orderClause);
    } catch (error) {
      console.error('Error fetching active users:', error);
      throw new HttpException(500, 'Internal server error while fetching active users');
    }
  }

  /**
   * Get all inactive users
   */
  async findAllInactive(): Promise<User[]> {
    try {
      return await UserRepository.findAllInactive(pool);
    } catch (error) {
      console.error('Error fetching inactive users:', error);
      throw new HttpException(500, 'Internal server error while fetching inactive users');
    }
  }

  /**
   * Get active user by ID
   */
  async findActiveById(id: number): Promise<User> {
    try {
      const user = await UserRepository.findActiveById(pool, id);

      if (!user) {
        throw new HttpException(404, 'Active user not found');
      }

      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error fetching active user:', error);
      throw new HttpException(500, 'Internal server error while fetching active user');
    }
  }

  /**
   * Create new user
   */
  async create(userData: CreateUserRequest): Promise<User> {
    const { name, username, password, role } = userData;

    try {
      // Check if username already exists
      const usernameExists = await UserRepository.checkUsernameExists(pool, username);
      
      if (usernameExists) {
        throw new HttpException(409, 'Username already exists');
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const createData: CreateUserData = {
        name,
        username,
        password: hashedPassword,
        role
      };

      return await UserRepository.create(pool, createData);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error creating user:', error);
      throw new HttpException(500, 'Internal server error while creating user');
    }
  }

  /**
   * Update user
   */
  async update(id: number, userData: UpdateUserRequest): Promise<User> {
    const { name, username, password, role } = userData;

    try {
      // Check if user exists
      const exists = await UserRepository.checkExists(pool, id);
      
      if (!exists) {
        throw new HttpException(404, 'User not found');
      }

      // Check if another user with same username exists
      const usernameExists = await UserRepository.checkUsernameExistsExcludingId(pool, username, id);
      
      if (usernameExists) {
        throw new HttpException(409, 'Username already exists');
      }

      const updateData: UpdateUserData = {
        name,
        username,
        password,
        role
      };

      if (password && password.trim().length > 0) {
        // Update with new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        updateData.password = hashedPassword;
        
        return await UserRepository.updateWithPassword(pool, id, updateData);
      } else {
        // Update without password
        return await UserRepository.updateWithoutPassword(pool, id, updateData);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error updating user:', error);
      throw new HttpException(500, 'Internal server error while updating user');
    }
  }

  /**
   * Soft delete user (set is_active = false)
   */
  async softDelete(id: number): Promise<User> {
    try {
      // Check if user exists
      const exists = await UserRepository.checkExists(pool, id);
      
      if (!exists) {
        throw new HttpException(404, 'User not found');
      }

      // Soft delete user
      return await UserRepository.softDelete(pool, id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error soft deleting user:', error);
      throw new HttpException(500, 'Internal server error while deleting user');
    }
  }

  /**
   * Toggle user activation
   */
  async toggleActivation(id: number): Promise<User> {
    try {
      // Check if user exists
      const exists = await UserRepository.checkExists(pool, id);
      
      if (!exists) {
        throw new HttpException(404, 'User not found');
      }

      // Toggle activation
      return await UserRepository.toggleActivation(pool, id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error toggling user activation:', error);
      throw new HttpException(500, 'Internal server error while toggling user activation');
    }
  }
} 