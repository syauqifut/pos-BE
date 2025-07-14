import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { unitQueries } from './unit.sql';

export interface Unit {
  id: number;
  name: string;
}

export interface CreateUnitRequest {
  name: string;
}

export interface UpdateUnitRequest {
  name: string;
}

export class UnitService {
  /**
   * Get all units
   */
  async findAll(): Promise<Unit[]> {
    try {
      const result = await pool.query(unitQueries.findAll);
      return result.rows;
    } catch (error) {
      console.error('Error fetching units:', error);
      throw new HttpException(500, 'Internal server error while fetching units');
    }
  }

  /**
   * Get unit by ID
   */
  async findById(id: number): Promise<Unit> {
    try {
      const result = await pool.query(unitQueries.findById, [id]);

      if (result.rows.length === 0) {
        throw new HttpException(404, 'Unit not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error fetching unit:', error);
      throw new HttpException(500, 'Internal server error while fetching unit');
    }
  }

  /**
   * Create new unit
   */
  async create(unitData: CreateUnitRequest): Promise<Unit> {
    const { name } = unitData;

    try {
      // Check if unit with same name already exists
      const nameExistsResult = await pool.query(unitQueries.checkNameExists, [name]);
      
      if (nameExistsResult.rows[0].exists) {
        throw new HttpException(409, 'Unit with this name already exists');
      }

      // Create unit
      const result = await pool.query(unitQueries.create, [name.trim()]);

      return result.rows[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error creating unit:', error);
      throw new HttpException(500, 'Internal server error while creating unit');
    }
  }

  /**
   * Update unit
   */
  async update(id: number, unitData: UpdateUnitRequest): Promise<Unit> {
    const { name } = unitData;

    try {
      // Check if unit exists
      const existsResult = await pool.query(unitQueries.checkExists, [id]);
      
      if (!existsResult.rows[0].exists) {
        throw new HttpException(404, 'Unit not found');
      }

      // Check if another unit with same name exists
      const nameExistsResult = await pool.query(unitQueries.checkNameExistsExcludingId, [name, id]);
      
      if (nameExistsResult.rows[0].exists) {
        throw new HttpException(409, 'Unit with this name already exists');
      }

      // Update unit
      const result = await pool.query(unitQueries.update, [name.trim(), id]);

      return result.rows[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error updating unit:', error);
      throw new HttpException(500, 'Internal server error while updating unit');
    }
  }

  /**
   * Delete unit
   */
  async delete(id: number): Promise<Unit> {
    try {
      // Check if unit exists
      const existsResult = await pool.query(unitQueries.checkExists, [id]);
      
      if (!existsResult.rows[0].exists) {
        throw new HttpException(404, 'Unit not found');
      }

      // Delete unit
      const result = await pool.query(unitQueries.delete, [id]);

      return result.rows[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error deleting unit:', error);
      throw new HttpException(500, 'Internal server error while deleting unit');
    }
  }
} 