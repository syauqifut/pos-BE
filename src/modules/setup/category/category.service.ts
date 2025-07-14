import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { categoryQueries } from './category.sql';

export interface Category {
  id: number;
  name: string;
}

export interface CreateCategoryRequest {
  name: string;
}

export interface UpdateCategoryRequest {
  name: string;
}

export class CategoryService {
  /**
   * Get all categories
   */
  async findAll(): Promise<Category[]> {
    try {
      const result = await pool.query(categoryQueries.findAll);
      return result.rows;
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
      const result = await pool.query(categoryQueries.findById, [id]);

      if (result.rows.length === 0) {
        throw new HttpException(404, 'Category not found');
      }

      return result.rows[0];
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
      const nameExistsResult = await pool.query(categoryQueries.checkNameExists, [name]);
      
      if (nameExistsResult.rows[0].exists) {
        throw new HttpException(409, 'Category with this name already exists');
      }

      // Create category
      const result = await pool.query(categoryQueries.create, [name.trim()]);
      return result.rows[0];
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
      const existsResult = await pool.query(categoryQueries.checkExists, [id]);
      
      if (!existsResult.rows[0].exists) {
        throw new HttpException(404, 'Category not found');
      }

      // Check if another category with same name exists
      const nameExistsResult = await pool.query(categoryQueries.checkNameExistsExcludingId, [name, id]);
      
      if (nameExistsResult.rows[0].exists) {
        throw new HttpException(409, 'Category with this name already exists');
      }

      // Update category
      const result = await pool.query(categoryQueries.update, [name.trim(), id]);
      return result.rows[0];
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
      const existsResult = await pool.query(categoryQueries.checkExists, [id]);
      
      if (!existsResult.rows[0].exists) {
        throw new HttpException(404, 'Category not found');
      }

      // Delete category
      const result = await pool.query(categoryQueries.delete, [id]);
      return result.rows[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error deleting category:', error);
      throw new HttpException(500, 'Internal server error while deleting category');
    }
  }
} 