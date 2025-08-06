import { Pool, PoolClient } from 'pg';

export interface Manufacturer {
  id: number;
  name: string;
}

export class ManufacturerRepository {
  /**
   * Get all manufacturers with search and sort
   */
  static async findAll(
    pool: Pool, 
    whereClause: string, 
    values: any[], 
    orderClause: string
  ): Promise<Manufacturer[]> {
    const query = `
      SELECT 
        id,
        name
      FROM manufacturers
      ${whereClause}
      ${orderClause}
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Get manufacturer by ID
   */
  static async findById(pool: Pool, id: number): Promise<Manufacturer | null> {
    const query = `
      SELECT 
        id,
        name
      FROM manufacturers
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Check if manufacturer exists
   */
  static async checkExists(pool: Pool, id: number): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM manufacturers WHERE id = $1)
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0].exists;
  }

  /**
   * Check if manufacturer name exists (for duplicate prevention)
   */
  static async checkNameExists(pool: Pool, name: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM manufacturers WHERE LOWER(name) = LOWER($1))
    `;

    const result = await pool.query(query, [name]);
    return result.rows[0].exists;
  }

  /**
   * Check if manufacturer name exists excluding current ID (for update)
   */
  static async checkNameExistsExcludingId(pool: Pool, name: string, excludeId: number): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM manufacturers WHERE LOWER(name) = LOWER($1) AND id != $2)
    `;

    const result = await pool.query(query, [name, excludeId]);
    return result.rows[0].exists;
  }

  /**
   * Create new manufacturer
   */
  static async create(pool: Pool, name: string): Promise<Manufacturer> {
    const query = `
      INSERT INTO manufacturers (name) 
      VALUES ($1) 
      RETURNING id, name
    `;

    const result = await pool.query(query, [name.trim()]);
    return result.rows[0];
  }

  /**
   * Update manufacturer
   */
  static async update(pool: Pool, id: number, name: string): Promise<Manufacturer> {
    const query = `
      UPDATE manufacturers 
      SET name = $1 
      WHERE id = $2 
      RETURNING id, name
    `;

    const result = await pool.query(query, [name.trim(), id]);
    return result.rows[0];
  }

  /**
   * Delete manufacturer
   */
  static async delete(pool: Pool, id: number): Promise<Manufacturer> {
    const query = `
      DELETE FROM manufacturers 
      WHERE id = $1 
      RETURNING id, name
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
} 