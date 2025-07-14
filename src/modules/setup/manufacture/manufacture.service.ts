import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { manufactureQueries } from './manufacture.sql';

export interface Manufacture {
  id: number;
  name: string;
}

export interface CreateManufactureRequest {
  name: string;
}

export interface UpdateManufactureRequest {
  name: string;
}

export class ManufactureService {
  /**
   * Get all manufactures
   */
  async findAll(): Promise<Manufacture[]> {
    try {
      const result = await pool.query(manufactureQueries.findAll);
      return result.rows;
    } catch (error) {
      console.error('Error fetching manufactures:', error);
      throw new HttpException(500, 'Internal server error while fetching manufactures');
    }
  }

  /**
   * Get manufacture by ID
   */
  async findById(id: number): Promise<Manufacture> {
    try {
      const result = await pool.query(manufactureQueries.findById, [id]);

      if (result.rows.length === 0) {
        throw new HttpException(404, 'Manufacture not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error fetching manufacture:', error);
      throw new HttpException(500, 'Internal server error while fetching manufacture');
    }
  }

  /**
   * Create new manufacture
   */
  async create(manufactureData: CreateManufactureRequest): Promise<Manufacture> {
    const { name } = manufactureData;

    try {
      // Check if manufacture with same name already exists
      const nameExistsResult = await pool.query(manufactureQueries.checkNameExists, [name]);
      
      if (nameExistsResult.rows[0].exists) {
        throw new HttpException(409, 'Manufacture with this name already exists');
      }

      // Create manufacture
      const result = await pool.query(manufactureQueries.create, [name.trim()]);
      return result.rows[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error creating manufacture:', error);
      throw new HttpException(500, 'Internal server error while creating manufacture');
    }
  }

  /**
   * Update manufacture
   */
  async update(id: number, manufactureData: UpdateManufactureRequest): Promise<Manufacture> {
    const { name } = manufactureData;

    try {
      // Check if manufacture exists
      const existsResult = await pool.query(manufactureQueries.checkExists, [id]);
      
      if (!existsResult.rows[0].exists) {
        throw new HttpException(404, 'Manufacture not found');
      }

      // Check if another manufacture with same name exists
      const nameExistsResult = await pool.query(manufactureQueries.checkNameExistsExcludingId, [name, id]);
      
      if (nameExistsResult.rows[0].exists) {
        throw new HttpException(409, 'Manufacture with this name already exists');
      }

      // Update manufacture
      const result = await pool.query(manufactureQueries.update, [name.trim(), id]);
      return result.rows[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error updating manufacture:', error);
      throw new HttpException(500, 'Internal server error while updating manufacture');
    }
  }

  /**
   * Delete manufacture
   */
  async delete(id: number): Promise<Manufacture> {
    try {
      // Check if manufacture exists
      const existsResult = await pool.query(manufactureQueries.checkExists, [id]);
      
      if (!existsResult.rows[0].exists) {
        throw new HttpException(404, 'Manufacture not found');
      }

      // Delete manufacture
      const result = await pool.query(manufactureQueries.delete, [id]);
      return result.rows[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error deleting manufacture:', error);
      throw new HttpException(500, 'Internal server error while deleting manufacture');
    }
  }
} 