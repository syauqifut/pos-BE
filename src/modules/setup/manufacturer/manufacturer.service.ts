import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { ManufacturerRepository, Manufacturer } from './manufacturer.repository';

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

      return await ManufacturerRepository.findAll(pool, whereClause, values, orderClause);
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
      const manufacturer = await ManufacturerRepository.findById(pool, id);

      if (!manufacturer) {
        throw new HttpException(404, 'Manufacturer not found');
      }

      return manufacturer;
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
      const nameExists = await ManufacturerRepository.checkNameExists(pool, name);
      
      if (nameExists) {
        throw new HttpException(409, 'Manufacturer with this name already exists');
      }

      // Create manufacturer
      return await ManufacturerRepository.create(pool, name);
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
      const exists = await ManufacturerRepository.checkExists(pool, id);
      
      if (!exists) {
        throw new HttpException(404, 'Manufacturer not found');
      }

      // Check if another manufacturer with same name exists
      const nameExists = await ManufacturerRepository.checkNameExistsExcludingId(pool, name, id);
      
      if (nameExists) {
        throw new HttpException(409, 'Manufacturer with this name already exists');
      }

      // Update manufacturer
      return await ManufacturerRepository.update(pool, id, name);
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
      const exists = await ManufacturerRepository.checkExists(pool, id);
      
      if (!exists) {
        throw new HttpException(404, 'Manufacturer not found');
      }

      // Delete manufacturer
      return await ManufacturerRepository.delete(pool, id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error deleting manufacturer:', error);
      throw new HttpException(500, 'Internal server error while deleting manufacturer');
    }
  }
} 