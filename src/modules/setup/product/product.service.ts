import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { productQueries } from './product.sql';

export interface Product {
  id: number;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  image_url?: string;
  category?: {
    id: number;
    name: string;
  } | null;
  manufacturer?: {
    id: number;
    name: string;
  } | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: number;
  updated_by: number;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  image_url?: string;
  category?: { id: number; name: string };
  manufacturer?: { id: number; name: string };
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  image_url?: string;
  category?: { id: number; name: string };
  manufacturer?: { id: number; name: string };
}

export interface FindAllOptions {
  search?: string;
  sort_by?: 'name' | 'description' | 'category' | 'manufacturer';
  sort_order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ProductService {
  /**
   * Transform raw query result to Product format
   */
  private transformProduct(row: any): Product {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      sku: row.sku,
      barcode: row.barcode,
      image_url: row.image_url,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name
      } : null,
      manufacturer: row.manufacture_id ? {
        id: row.manufacture_id,
        name: row.manufacture_name
      } : null,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by
    };
  }

  /**
   * Build dynamic WHERE clause for search and filters
   */
  private buildWhereClause(options: FindAllOptions): { whereClause: string; values: any[] } {
    const conditions: string[] = ['p.is_active = true'];
    const values: any[] = [];
    let paramCount = 0;

    // Search functionality
    if (options.search) {
      paramCount++;
      conditions.push(`(
        p.name ILIKE $${paramCount} OR 
        p.sku ILIKE $${paramCount} OR 
        p.barcode ILIKE $${paramCount} OR
        c.name ILIKE $${paramCount} OR
        m.name ILIKE $${paramCount}
      )`);
      values.push(`%${options.search}%`);
    }

    // // Filter by category_id
    // if (options.category_id) {
    //   paramCount++;
    //   conditions.push(`p.category_id = $${paramCount}`);
    //   values.push(options.category_id);
    // }

    // // Filter by manufacturer_id
    // if (options.manufacturer_id) {
    //   paramCount++;
    //   conditions.push(`p.manufacture_id = $${paramCount}`);
    //   values.push(options.manufacturer_id);
    // }

    return {
      whereClause: conditions.join(' AND '),
      values
    };
  }

  /**
   * Build ORDER BY clause
   */
  private buildOrderClause(options: FindAllOptions): string {
    const sortBy = options.sort_by || 'name';
    const sortOrder = options.sort_order || 'ASC';
    
    // Validate sort_by field to prevent SQL injection
    const allowedSortFields = ['name', 'id', 'description', 'category', 'manufacturer'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'name';
    
    // Map sort fields to actual column names with case-insensitive sorting
    let orderByField: string;
    switch (safeSortBy) {
      case 'category':
        orderByField = 'LOWER(c.name)';
        break;
      case 'manufacturer':
        orderByField = 'LOWER(m.name)';
        break;
      case 'name':
        orderByField = 'LOWER(p.name)';
        break;
      case 'description':
        orderByField = 'LOWER(p.description)';
        break;
      default:
        orderByField = `p.${safeSortBy}`;
    }
    
    return `ORDER BY ${orderByField} ${sortOrder}`;
  }

  /**
   * Get all products with search, filter, sort, and pagination
   */
  async findAll(options: FindAllOptions = {}): Promise<PaginatedResult<Product>> {
    try {
      const page = options.page || 1;
      const limit = options.limit || Number.MAX_SAFE_INTEGER;
      const offset = (page - 1) * limit;

      const { whereClause, values } = this.buildWhereClause(options);
      const orderClause = this.buildOrderClause(options);

      // Build final query
      const baseQuery = productQueries.findAll.replace('WHERE p.is_active = true', `WHERE ${whereClause}`);
      const finalQuery = `${baseQuery} ${orderClause} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

      // Get total count for pagination
      const countQuery = productQueries.countAll.replace('WHERE p.is_active = true', `WHERE ${whereClause}`);
      const countResult = await pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const result = await pool.query(finalQuery, [...values, limit, offset]);
      const products = result.rows.map(row => this.transformProduct(row));

      return {
        data: products,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw new HttpException(500, 'Internal server error while fetching products');
    }
  }

  /**
   * Get product by ID
   */
  async findById(id: number): Promise<Product> {
    try {
      const result = await pool.query(productQueries.findById, [id]);

      if (result.rows.length === 0) {
        throw new HttpException(404, 'Product not found');
      }

      return this.transformProduct(result.rows[0]);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error fetching product:', error);
      throw new HttpException(500, 'Internal server error while fetching product');
    }
  }

  /**
   * Validate SKU uniqueness
   */
  private async validateSkuUniqueness(sku: string, excludeId?: number): Promise<void> {
    if (!sku) return;

    const result = await pool.query(productQueries.checkSkuUniqueness, [sku, excludeId || null]);
    if (result.rows.length > 0) {
      throw new HttpException(400, 'SKU already exists');
    }
  }

  /**
   * Validate barcode uniqueness
   */
  private async validateBarcodeUniqueness(barcode: string, excludeId?: number): Promise<void> {
    if (!barcode) return;

    const result = await pool.query(productQueries.checkBarcodeUniqueness, [barcode, excludeId || null]);
    if (result.rows.length > 0) {
      throw new HttpException(400, 'Barcode already exists');
    }
  }

  /**
   * Create new product
   */
  async create(productData: CreateProductRequest, userId: number): Promise<Product> {
    try {
      // Validate uniqueness
      // Validate uniqueness only if values are provided
      if (productData.sku) {
        await this.validateSkuUniqueness(productData.sku);
      }
      if (productData.barcode) {
        await this.validateBarcodeUniqueness(productData.barcode);
      }

      const result = await pool.query(productQueries.create, [
        productData.name,
        productData.description || null,
        productData.sku || null,
        productData.barcode || null,
        productData.image_url || null,
        productData.category?.id || null,
        productData.manufacturer?.id || null,
        userId, // created_by
        userId  // updated_by
      ]);

      const createdId = result.rows[0].id;
      return await this.findById(createdId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error creating product:', error);
      throw new HttpException(500, 'Internal server error while creating product');
    }
  }

  /**
   * Update product
   */
  async update(id: number, productData: UpdateProductRequest, userId: number): Promise<Product> {
    try {
      // Check if product exists
      await this.findById(id);

      // Validate uniqueness if sku or barcode is being updated
      if (productData.sku) {
        await this.validateSkuUniqueness(productData.sku, id);
      }
      if (productData.barcode) {
        await this.validateBarcodeUniqueness(productData.barcode, id);
      }

      // Get current data to fill in missing fields
      const currentProduct = await this.findById(id);

      const result = await pool.query(productQueries.update, [
        id,
        productData.name !== undefined ? productData.name : currentProduct.name,
        productData.description ? productData.description : null,
        productData.sku ? productData.sku : null,
        productData.barcode ? productData.barcode : null,
        productData.image_url ? productData.image_url : null,
        productData.category ? productData.category?.id : null,
        productData.manufacturer ? productData.manufacturer?.id : null,
        userId // updated_by
      ]);

      if (result.rows.length === 0) {
        throw new HttpException(404, 'Product not found or already deleted');
      }

      return await this.findById(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error updating product:', error);
      throw new HttpException(500, 'Internal server error while updating product');
    }
  }

  /**
   * Soft delete product
   */
  async delete(id: number, userId: number): Promise<Product> {
    try {
      // Get current product data before deletion
      const currentProduct = await this.findById(id);

      const result = await pool.query(productQueries.softDelete, [id, userId]);

      if (result.rows.length === 0) {
        throw new HttpException(404, 'Product not found or already deleted');
      }

      // Return the product data as it was before deletion
      return currentProduct;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error deleting product:', error);
      throw new HttpException(500, 'Internal server error while deleting product');
    }
  }
} 