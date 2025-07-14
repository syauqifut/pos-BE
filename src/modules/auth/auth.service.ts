import bcrypt from 'bcryptjs';
import { HttpException } from '../../exceptions/HttpException';
import { generateToken, JwtPayload } from '../../utils/helpers';
import pool from '../../db';
import { authQueries } from './auth.sql';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    id: number;
    username: string;
    name: string;
    role: string;
  };
}

export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class AuthService {
  /**
   * Authenticate user with username and password
   */
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    const { username, password } = loginData;

    try {
      // Find user by username
      const result = await pool.query(authQueries.findUserByUsername, [username]);

      if (result.rows.length === 0) {
        throw new HttpException(401, 'Invalid username or password');
      }

      const user: User = result.rows[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new HttpException(401, 'Invalid username or password');
      }

      // Generate JWT token
      const tokenPayload: JwtPayload = {
        userId: user.id,
        username: user.username,
        role: user.role
      };

      const token = generateToken(tokenPayload);

      // Optional: Update last login timestamp
      await pool.query(authQueries.updateLastLogin, [user.id]);

      // Return successful login response
      return {
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        }
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      console.error('Auth service error:', error);
      throw new HttpException(500, 'Internal server error during authentication');
    }
  }

  /**
   * Verify user exists by ID (used for token validation)
   */
  async verifyUserExists(userId: number): Promise<boolean> {
    try {
      const result = await pool.query(authQueries.findUserById, [userId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error verifying user:', error);
      return false;
    }
  }
} 