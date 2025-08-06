import { Pool, PoolClient } from 'pg';

export interface User {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'kasir';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  name: string;
  username: string;
  password: string;
  role: 'admin' | 'kasir';
}

export interface UpdateUserData {
  name: string;
  username: string;
  password?: string;
  role: 'admin' | 'kasir';
}

export class UserRepository {
  /**
   * Get all active users with search and sort
   */
  static async findAllActive(
    pool: Pool, 
    whereClause: string, 
    values: any[], 
    orderClause: string
  ): Promise<User[]> {
    const query = `
      SELECT 
        id,
        name,
        username,
        role,
        is_active,
        created_at,
        updated_at
      FROM users
      ${whereClause}
      ${orderClause}
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Get all inactive users
   */
  static async findAllInactive(pool: Pool): Promise<User[]> {
    const query = `
      SELECT 
        id,
        name,
        username,
        role,
        is_active,
        created_at,
        updated_at
      FROM users
      WHERE is_active = false
      ORDER BY name ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get active user by ID
   */
  static async findActiveById(pool: Pool, id: number): Promise<User | null> {
    const query = `
      SELECT 
        id,
        name,
        username,
        role,
        is_active,
        created_at,
        updated_at
      FROM users
      WHERE id = $1 AND is_active = true
    `;

    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Check if user exists
   */
  static async checkExists(pool: Pool, id: number): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0].exists;
  }

  /**
   * Check if username exists (for duplicate prevention)
   */
  static async checkUsernameExists(pool: Pool, username: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(username) = LOWER($1))
    `;

    const result = await pool.query(query, [username]);
    return result.rows[0].exists;
  }

  /**
   * Check if username exists excluding current ID (for update)
   */
  static async checkUsernameExistsExcludingId(pool: Pool, username: string, excludeId: number): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) AND id != $2)
    `;

    const result = await pool.query(query, [username, excludeId]);
    return result.rows[0].exists;
  }

  /**
   * Create new user
   */
  static async create(pool: Pool, data: CreateUserData): Promise<User> {
    const query = `
      INSERT INTO users (name, username, password, role) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, name, username, role, is_active, created_at, updated_at
    `;

    const result = await pool.query(query, [
      data.name.trim(),
      data.username.trim(),
      data.password,
      data.role
    ]);

    return result.rows[0];
  }

  /**
   * Update user with password
   */
  static async updateWithPassword(pool: Pool, id: number, data: UpdateUserData): Promise<User> {
    const query = `
      UPDATE users 
      SET name = $1, username = $2, password = $3, role = $4, updated_at = NOW()
      WHERE id = $5 
      RETURNING id, name, username, role, is_active, created_at, updated_at
    `;

    const result = await pool.query(query, [
      data.name.trim(),
      data.username.trim(),
      data.password,
      data.role,
      id
    ]);

    return result.rows[0];
  }

  /**
   * Update user without password
   */
  static async updateWithoutPassword(pool: Pool, id: number, data: UpdateUserData): Promise<User> {
    const query = `
      UPDATE users 
      SET name = $1, username = $2, role = $3, updated_at = NOW()
      WHERE id = $4 
      RETURNING id, name, username, role, is_active, created_at, updated_at
    `;

    const result = await pool.query(query, [
      data.name.trim(),
      data.username.trim(),
      data.role,
      id
    ]);

    return result.rows[0];
  }

  /**
   * Soft delete user
   */
  static async softDelete(pool: Pool, id: number): Promise<User> {
    const query = `
      UPDATE users 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 
      RETURNING id, name, username, role, is_active, created_at, updated_at
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Toggle user activation
   */
  static async toggleActivation(pool: Pool, id: number): Promise<User> {
    const query = `
      UPDATE users 
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = $1 
      RETURNING id, name, username, role, is_active, created_at, updated_at
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
} 