import bcrypt from 'bcryptjs';
import { HttpException } from '../../exceptions/HttpException';
import { generateToken, JwtPayload } from '../../utils/helpers';
import pool from '../../db';
import { AuthRepository, User } from './auth.repository';

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

export class AuthService {
  /**
   * Authenticate user with username and password
   */
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    const { username, password } = loginData;

    try {
      // Find user by username
      const user = await AuthRepository.findByUsername(pool, username);

      if (!user) {
        throw new HttpException(401, 'Invalid username or password');
      }

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
      await AuthRepository.updateLastLogin(pool, user.id);

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
      const user = await AuthRepository.findById(pool, userId);
      return user !== null;
    } catch (error) {
      console.error('Error verifying user:', error);
      return false;
    }
  }
} 