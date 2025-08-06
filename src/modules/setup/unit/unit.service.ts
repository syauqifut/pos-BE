import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { UnitRepository, Unit } from './unit.repository';

export interface CreateUnitRequest {
  name: string;
}

export interface UpdateUnitRequest {
  name: string;
}

export interface FindAllOptions {
  search?: string;
  sort_by?: 'name' | 'id';
  sort_order?: string;
}

export class UnitService {
  /**
   * Get all units with search and sort
   */
  async findAll(options: FindAllOptions = {}): Promise<Unit[]> {
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

      return await UnitRepository.findAll(pool, whereClause, values, orderClause);
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
      const unit = await UnitRepository.findById(pool, id);

      if (!unit) {
        throw new HttpException(404, 'Unit not found');
      }

      return unit;
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
      const nameExists = await UnitRepository.checkNameExists(pool, name);
      
      if (nameExists) {
        throw new HttpException(409, 'Unit with this name already exists');
      }

      // Create unit
      return await UnitRepository.create(pool, name);
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
      const exists = await UnitRepository.checkExists(pool, id);
      
      if (!exists) {
        throw new HttpException(404, 'Unit not found');
      }

      // Check if another unit with same name exists
      const nameExists = await UnitRepository.checkNameExistsExcludingId(pool, name, id);
      
      if (nameExists) {
        throw new HttpException(409, 'Unit with this name already exists');
      }

      // Update unit
      return await UnitRepository.update(pool, id, name);
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
      const exists = await UnitRepository.checkExists(pool, id);
      
      if (!exists) {
        throw new HttpException(404, 'Unit not found');
      }

      // Delete unit
      return await UnitRepository.delete(pool, id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error deleting unit:', error);
      throw new HttpException(500, 'Internal server error while deleting unit');
    }
  }
} 