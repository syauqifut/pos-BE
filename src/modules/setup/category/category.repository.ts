import { Pool, PoolClient } from 'pg';

export interface Category {
  id: number;
  name: string;
}

export class CategoryRepository {
  /**
   * Get all categories with search and sort
   */
  static async findAll(
    pool: Pool, 
    whereClause: string, 
    values: any[], 
    orderClause: string
  ): Promise<Category[]> {
    const query = `
      SELECT 
        id,
        name
      FROM categories
      ${whereClause}
      ${orderClause}
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Get category by ID
   */
  static async findById(pool: Pool, id: number): Promise<Category | null> {
    const query = `
      SELECT 
        id,
        name
      FROM categories
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Check if category exists
   */
  static async checkExists(pool: Pool, id: number): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM categories WHERE id = $1)
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0].exists;
  }

  /**
   * Check if category name exists (for duplicate prevention)
   */
  static async checkNameExists(pool: Pool, name: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1))
    `;

    const result = await pool.query(query, [name]);
    return result.rows[0].exists;
  }

  /**
   * Check if category name exists excluding current ID (for update)
   */
  static async checkNameExistsExcludingId(pool: Pool, name: string, excludeId: number): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2)
    `;

    const result = await pool.query(query, [name, excludeId]);
    return result.rows[0].exists;
  }

  /**
   * Create new category
   */
  static async create(pool: Pool, name: string): Promise<Category> {
    const query = `
      INSERT INTO categories (name) 
      VALUES ($1) 
      RETURNING id, name
    `;

    const result = await pool.query(query, [name.trim()]);
    return result.rows[0];
  }

  /**
   * Update category
   */
  static async update(pool: Pool, id: number, name: string): Promise<Category> {
    const query = `
      UPDATE categories 
      SET name = $1 
      WHERE id = $2 
      RETURNING id, name
    `;

    const result = await pool.query(query, [name.trim(), id]);
    return result.rows[0];
  }

  /**
   * Delete category
   */
  static async delete(pool: Pool, id: number): Promise<Category> {
    const query = `
      DELETE FROM categories 
      WHERE id = $1 
      RETURNING id, name
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
} 