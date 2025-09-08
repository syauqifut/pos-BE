import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { ProductRepository, Product, CreateProductData, UpdateProductData } from './product.repository';

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

      // Get total count for pagination
      const total = await ProductRepository.countAll(pool, whereClause, values);

      // Get paginated results
      const products = await ProductRepository.findAll(pool, whereClause, values, orderClause, limit, offset);
// console.log(products);
// process.exit(0);
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
      const product = await ProductRepository.findById(pool, id);

      if (!product) {
        throw new HttpException(404, 'Product not found');
      }

      return product;
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

    const isUnique = await ProductRepository.checkSkuUniqueness(pool, sku, excludeId);
    if (!isUnique) {
      throw new HttpException(400, 'SKU already exists');
    }
  }

  /**
   * Validate barcode uniqueness
   */
  private async validateBarcodeUniqueness(barcode: string, excludeId?: number): Promise<void> {
    if (!barcode) return;

    const isUnique = await ProductRepository.checkBarcodeUniqueness(pool, barcode, excludeId);
    if (!isUnique) {
      throw new HttpException(400, 'Barcode already exists');
    }
  }

  /**
   * Create new product
   */
  async create(productData: CreateProductRequest, userId: number): Promise<Product> {
    try {
      // Validate uniqueness
      if (productData.sku) {
        await this.validateSkuUniqueness(productData.sku);
      }
      if (productData.barcode) {
        await this.validateBarcodeUniqueness(productData.barcode);
      }

      const createData: CreateProductData = {
        name: productData.name,
        description: productData.description,
        sku: productData.sku,
        barcode: productData.barcode,
        image_url: productData.image_url,
        category_id: productData.category?.id,
        manufacturer_id: productData.manufacturer?.id,
        created_by: userId,
        updated_by: userId
      };

      const createdId = await ProductRepository.create(pool, createData);
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

      const updateData: UpdateProductData = {
        name: productData.name !== undefined ? productData.name : currentProduct.name,
        description: productData.description,
        sku: productData.sku,
        barcode: productData.barcode,
        image_url: productData.image_url,
        category_id: productData.category?.id,
        manufacturer_id: productData.manufacturer?.id,
        updated_by: userId
      };

      const success = await ProductRepository.update(pool, id, updateData);

      if (!success) {
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

      const success = await ProductRepository.softDelete(pool, id, userId);

      if (!success) {
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