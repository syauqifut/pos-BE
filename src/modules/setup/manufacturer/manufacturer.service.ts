import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { manufacturerQueries } from './manufacturer.sql';

export interface Manufacturer {
  id: number;
  name: string;
}

export interface CreateManufacturerRequest {
  name: string;
}

export interface UpdateManufacturerRequest {
  name: string;
}

export interface FindAllOptions {
  search?: string;
  sort_by?: 'name' | 'id';
  sort_order?: string;
}

export class ManufacturerService {
  /**
   * Get all manufacturers with search and sort
   */
  async findAll(options: FindAllOptions = {}): Promise<Manufacturer[]> {
    try {
      const { search, sort_by = 'name', sort_order = 'ASC' } = options;
      
      let whereClause = '';
      const values: any[] = [];
      let paramCount = 0;

      // Add search condition if provided
      if (search) {
        paramCount++;
        whereClause = `WHERE name ILIKE $${paramCount}`;
        values.push(`%${search}%`);
      }

      // Build ORDER BY clause
      const orderColumn = sort_by === 'id' ? 'id' : 'name';
      const orderClause = `ORDER BY ${orderColumn} ${sort_order}`;

      // Build final query
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
    } catch (error) {
      console.error('Error fetching manufacturers:', error);
      throw new HttpException(500, 'Internal server error while fetching manufacturers');
    }
  }

  /**
   * Get manufacturer by ID
   */
  async findById(id: number): Promise<Manufacturer> {
    try {
      const result = await pool.query(manufacturerQueries.findById, [id]);

      if (result.rows.length === 0) {
        throw new HttpException(404, 'Manufacturer not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error fetching manufacturer:', error);
      throw new HttpException(500, 'Internal server error while fetching manufacturer');
    }
  }

  /**
   * Create new manufacturer
   */
  async create(manufacturerData: CreateManufacturerRequest): Promise<Manufacturer> {
    const { name } = manufacturerData;

    try {
      // Check if manufacturer with same name already exists
      const nameExistsResult = await pool.query(manufacturerQueries.checkNameExists, [name]);
      
      if (nameExistsResult.rows[0].exists) {
        throw new HttpException(409, 'Manufacturer with this name already exists');
      }

      // Create manufacturer
      const result = await pool.query(manufacturerQueries.create, [name.trim()]);
      return result.rows[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error creating manufacturer:', error);
      throw new HttpException(500, 'Internal server error while creating manufacturer');
    }
  }

  /**
   * Update manufacturer
   */
  async update(id: number, manufacturerData: UpdateManufacturerRequest): Promise<Manufacturer> {
    const { name } = manufacturerData;

    try {
      // Check if manufacturer exists
      const existsResult = await pool.query(manufacturerQueries.checkExists, [id]);
      
      if (!existsResult.rows[0].exists) {
        throw new HttpException(404, 'Manufacturer not found');
      }

      // Check if another manufacturer with same name exists
      const nameExistsResult = await pool.query(manufacturerQueries.checkNameExistsExcludingId, [name, id]);
      
      if (nameExistsResult.rows[0].exists) {
        throw new HttpException(409, 'Manufacturer with this name already exists');
      }

      // Update manufacturer
      const result = await pool.query(manufacturerQueries.update, [name.trim(), id]);
      return result.rows[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error updating manufacturer:', error);
      throw new HttpException(500, 'Internal server error while updating manufacturer');
    }
  }

  /**
   * Delete manufacturer
   */
  async delete(id: number): Promise<Manufacturer> {
    try {
      // Check if manufacturer exists
      const existsResult = await pool.query(manufacturerQueries.checkExists, [id]);
      
      if (!existsResult.rows[0].exists) {
        throw new HttpException(404, 'Manufacturer not found');
      }

      // Delete manufacturer
      const result = await pool.query(manufacturerQueries.delete, [id]);
      return result.rows[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error deleting manufacturer:', error);
      throw new HttpException(500, 'Internal server error while deleting manufacturer');
    }
  }
} 