import { Pool, PoolClient } from 'pg';

export interface Unit {
  id: number;
  name: string;
}

export class UnitRepository {
  /**
   * Get all units with search and sort
   */
  static async findAll(
    pool: Pool, 
    whereClause: string, 
    values: any[], 
    orderClause: string
  ): Promise<Unit[]> {
    const query = `
      SELECT 
        id,
        name
      FROM units
      ${whereClause}
      ${orderClause}
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Get unit by ID
   */
  static async findById(pool: Pool, id: number): Promise<Unit | null> {
    const query = `
      SELECT 
        id,
        name
      FROM units
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Check if unit exists
   */
  static async checkExists(pool: Pool, id: number): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM units WHERE id = $1)
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0].exists;
  }

  /**
   * Check if unit name exists (for duplicate prevention)
   */
  static async checkNameExists(pool: Pool, name: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM units WHERE LOWER(name) = LOWER($1))
    `;

    const result = await pool.query(query, [name]);
    return result.rows[0].exists;
  }

  /**
   * Check if unit name exists excluding current ID (for update)
   */
  static async checkNameExistsExcludingId(pool: Pool, name: string, excludeId: number): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM units WHERE LOWER(name) = LOWER($1) AND id != $2)
    `;

    const result = await pool.query(query, [name, excludeId]);
    return result.rows[0].exists;
  }

  /**
   * Create new unit
   */
  static async create(pool: Pool, name: string): Promise<Unit> {
    const query = `
      INSERT INTO units (name) 
      VALUES ($1) 
      RETURNING id, name
    `;

    const result = await pool.query(query, [name.trim()]);
    return result.rows[0];
  }

  /**
   * Update unit
   */
  static async update(pool: Pool, id: number, name: string): Promise<Unit> {
    const query = `
      UPDATE units 
      SET name = $1 
      WHERE id = $2 
      RETURNING id, name
    `;

    const result = await pool.query(query, [name.trim(), id]);
    return result.rows[0];
  }

  /**
   * Delete unit
   */
  static async delete(pool: Pool, id: number): Promise<Unit> {
    const query = `
      DELETE FROM units 
      WHERE id = $1 
      RETURNING id, name
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
} 