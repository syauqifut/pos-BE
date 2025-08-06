import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { CategoryRepository, Category } from './category.repository';

export interface CreateCategoryRequest {
  name: string;
}

export interface UpdateCategoryRequest {
  name: string;
}

export interface FindAllOptions {
  search?: string;
  sort_by?: 'name' | 'id';
  sort_order?: string;
}

export class CategoryService {
  /**
   * Get all categories with search and sort
   */
  async findAll(options: FindAllOptions = {}): Promise<Category[]> {
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

      return await CategoryRepository.findAll(pool, whereClause, values, orderClause);
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new HttpException(500, 'Internal server error while fetching categories');
    }
  }

  /**
   * Get category by ID
   */
  async findById(id: number): Promise<Category> {
    try {
      const category = await CategoryRepository.findById(pool, id);

      if (!category) {
        throw new HttpException(404, 'Category not found');
      }

      return category;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error fetching category:', error);
      throw new HttpException(500, 'Internal server error while fetching category');
    }
  }

  /**
   * Create new category
   */
  async create(categoryData: CreateCategoryRequest): Promise<Category> {
    const { name } = categoryData;

    try {
      // Check if category with same name already exists
      const nameExists = await CategoryRepository.checkNameExists(pool, name);
      
      if (nameExists) {
        throw new HttpException(409, 'Category with this name already exists');
      }

      // Create category
      return await CategoryRepository.create(pool, name);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error creating category:', error);
      throw new HttpException(500, 'Internal server error while creating category');
    }
  }

  /**
   * Update category
   */
  async update(id: number, categoryData: UpdateCategoryRequest): Promise<Category> {
    const { name } = categoryData;

    try {
      // Check if category exists
      const exists = await CategoryRepository.checkExists(pool, id);
      
      if (!exists) {
        throw new HttpException(404, 'Category not found');
      }

      // Check if another category with same name exists
      const nameExists = await CategoryRepository.checkNameExistsExcludingId(pool, name, id);
      
      if (nameExists) {
        throw new HttpException(409, 'Category with this name already exists');
      }

      // Update category
      return await CategoryRepository.update(pool, id, name);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error updating category:', error);
      throw new HttpException(500, 'Internal server error while updating category');
    }
  }

  /**
   * Delete category
   */
  async delete(id: number): Promise<Category> {
    try {
      // Check if category exists
      const exists = await CategoryRepository.checkExists(pool, id);
      
      if (!exists) {
        throw new HttpException(404, 'Category not found');
      }

      // Delete category
      return await CategoryRepository.delete(pool, id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error deleting category:', error);
      throw new HttpException(500, 'Internal server error while deleting category');
    }
  }
} 