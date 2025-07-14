import bcrypt from 'bcryptjs';
import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { userQueries } from './user.sql';

export interface User {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'kasir';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

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

export class UserService {
  /**
   * Get all active users
   */
  async findAllActive(): Promise<User[]> {
    try {
      const result = await pool.query(userQueries.findAllActive);
      return result.rows;
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
      const result = await pool.query(userQueries.findAllInactive);
      return result.rows;
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
      const result = await pool.query(userQueries.findActiveById, [id]);

      if (result.rows.length === 0) {
        throw new HttpException(404, 'Active user not found');
      }

      return result.rows[0];
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
      const usernameExistsResult = await pool.query(userQueries.checkUsernameExists, [username]);
      
      if (usernameExistsResult.rows[0].exists) {
        throw new HttpException(409, 'Username already exists');
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const result = await pool.query(userQueries.create, [
        name.trim(),
        username.trim(),
        hashedPassword,
        role
      ]);

      return result.rows[0];
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
      const existsResult = await pool.query(userQueries.checkExists, [id]);
      
      if (!existsResult.rows[0].exists) {
        throw new HttpException(404, 'User not found');
      }

      // Check if another user with same username exists
      const usernameExistsResult = await pool.query(userQueries.checkUsernameExistsExcludingId, [username, id]);
      
      if (usernameExistsResult.rows[0].exists) {
        throw new HttpException(409, 'Username already exists');
      }

      let result;

      if (password && password.trim().length > 0) {
        // Update with new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        result = await pool.query(userQueries.updateWithPassword, [
          name.trim(),
          username.trim(),
          hashedPassword,
          role,
          id
        ]);
      } else {
        // Update without password
        result = await pool.query(userQueries.updateWithoutPassword, [
          name.trim(),
          username.trim(),
          role,
          id
        ]);
      }

      return result.rows[0];
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
      const existsResult = await pool.query(userQueries.checkExists, [id]);
      
      if (!existsResult.rows[0].exists) {
        throw new HttpException(404, 'User not found');
      }

      // Soft delete user
      const result = await pool.query(userQueries.softDelete, [id]);
      return result.rows[0];
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
      const existsResult = await pool.query(userQueries.checkExists, [id]);
      
      if (!existsResult.rows[0].exists) {
        throw new HttpException(404, 'User not found');
      }

      // Toggle activation
      const result = await pool.query(userQueries.toggleActivation, [id]);
      return result.rows[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error toggling user activation:', error);
      throw new HttpException(500, 'Internal server error while toggling user activation');
    }
  }
} 