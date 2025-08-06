import { Pool, PoolClient } from 'pg';

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

export class AuthRepository {
  /**
   * Find user by username
   */
  static async findByUsername(pool: Pool, username: string): Promise<User | null> {
    const query = `
      SELECT 
        id,
        username,
        password,
        name,
        role,
        is_active,
        created_at,
        updated_at
      FROM users 
      WHERE username = $1 AND is_active = true
    `;
    
    const result = await pool.query(query, [username]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Find user by ID (for token validation)
   */
  static async findById(pool: Pool, userId: number): Promise<User | null> {
    const query = `
      SELECT 
        id,
        username,
        name,
        role,
        is_active,
        created_at,
        updated_at
      FROM users 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Update user last login timestamp
   */
  static async updateLastLogin(pool: Pool, userId: number): Promise<void> {
    const query = `
      UPDATE users 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
    
    await pool.query(query, [userId]);
  }
} 