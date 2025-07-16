import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { stockQueries } from './stock.sql';

export interface StockItem {
  product_id: number;
  product_name: string;
  sku?: string;
  barcode?: string;
  image_url?: string;
  category?: {
    id: number;
    name: string;
  } | null;
  manufacture?: {
    id: number;
    name: string;
  } | null;
  unit?: {
    id: number;
    name: string;
  } | null;
  stock_quantity: number;
}

export interface StockTransaction {
  id: number;
  product_id: number;
  transaction_id?: number;
  type: 'sale' | 'purchase' | 'adjustment';
  qty: number;
  unit_id: number;
  description?: string;
  created_at: Date;
  created_by?: number;
}



export interface StockHistoryItem {
  id: number;
  product_id: number;
  transaction_id?: number;
  type: 'sale' | 'purchase' | 'adjustment';
  qty: number;
  description?: string;
  created_at: Date;
  created_by?: number;
  unit_name: string;
  created_by_name?: string;
}

export interface ProductStock {
  product_id: number;
  product_name: string;
  unit_id: number;
  unit_name: string;
  stock_quantity: number;
}

export interface FindAllStockOptions {
  search?: string;
  category_id?: number;
  manufacture_id?: number;
  sort_by?: 'name' | 'category' | 'manufacture' | 'stock';
  sort_order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class StockService {
  /**
   * Transform raw query result to StockItem format
   */
  private transformStockItem(row: any): StockItem {
    return {
      product_id: row.product_id,
      product_name: row.product_name,
      sku: row.sku,
      barcode: row.barcode,
      image_url: row.image_url,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name
      } : null,
      manufacture: row.manufacture_id ? {
        id: row.manufacture_id,
        name: row.manufacture_name
      } : null,
      unit: row.unit_id ? {
        id: row.unit_id,
        name: row.unit_name
      } : null,
      stock_quantity: parseInt(row.stock_quantity) || 0
    };
  }

  /**
   * Build dynamic WHERE clause for search and filters
   */
  private buildWhereClause(options: FindAllStockOptions): { whereClause: string; values: any[] } {
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

    // Filter by category_id
    if (options.category_id) {
      paramCount++;
      conditions.push(`p.category_id = $${paramCount}`);
      values.push(options.category_id);
    }

    // Filter by manufacture_id
    if (options.manufacture_id) {
      paramCount++;
      conditions.push(`p.manufacture_id = $${paramCount}`);
      values.push(options.manufacture_id);
    }

    return {
      whereClause: conditions.join(' AND '),
      values
    };
  }

  /**
   * Build ORDER BY clause for sorting
   */
  private buildOrderClause(options: FindAllStockOptions): string {
    const sortBy = options.sort_by || 'name';
    const sortOrder = options.sort_order || 'ASC';

    let orderColumn: string;
    switch (sortBy) {
      case 'category':
        orderColumn = 'c.name';
        break;
      case 'manufacture':
        orderColumn = 'm.name';
        break;
      case 'stock':
        orderColumn = 'stock_quantity';
        break;
      case 'name':
      default:
        orderColumn = 'p.name';
        break;
    }

    return `ORDER BY ${orderColumn} ${sortOrder}`;
  }

  /**
   * Get all stock information with search, filter, sort, and pagination
   */
  async findAll(options: FindAllStockOptions = {}): Promise<PaginatedResult<StockItem>> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const offset = (page - 1) * limit;

      const { whereClause, values } = this.buildWhereClause(options);
      const orderClause = this.buildOrderClause(options);

      // Build final query with GROUP BY for aggregation
      const baseQuery = stockQueries.findAllWithAggregation.replace('WHERE p.is_active = true', `WHERE ${whereClause}`);
      const groupByClause = 'GROUP BY p.id, p.name, p.sku, p.barcode, p.image_url, c.id, c.name, m.id, m.name, u.id, u.name';
      const finalQuery = `${baseQuery} ${groupByClause} ${orderClause} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

      // Get total count for pagination
      const countQuery = stockQueries.countAllProducts.replace('WHERE p.is_active = true', `WHERE ${whereClause}`);
      const countResult = await pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const result = await pool.query(finalQuery, [...values, limit, offset]);
      const stocks = result.rows.map(row => this.transformStockItem(row));

      return {
        data: stocks,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching stock information:', error);
      throw new HttpException(500, 'Internal server error while fetching stock information');
    }
  }

  /**
   * Get current stock for a specific product (helper method)
   */
  async getCurrentStockByProduct(productId: number): Promise<ProductStock[]> {
    try {
      const result = await pool.query(stockQueries.getCurrentStockByProduct, [productId]);
      
      return result.rows.map(row => ({
        product_id: row.product_id,
        product_name: row.product_name,
        unit_id: row.unit_id,
        unit_name: row.unit_name,
        stock_quantity: parseInt(row.stock_quantity) || 0
      }));
    } catch (error) {
      console.error('Error fetching product stock:', error);
      throw new HttpException(500, 'Internal server error while fetching product stock');
    }
  }



  /**
   * Get stock history for a product with pagination
   */
  async getStockHistory(productId: number, page: number = 1, limit: number = 20): Promise<PaginatedResult<StockHistoryItem>> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await pool.query(stockQueries.countStockHistory, [productId]);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated history
      const result = await pool.query(stockQueries.getStockHistory, [productId, limit, offset]);
      
      const history = result.rows.map(row => ({
        id: row.id,
        product_id: row.product_id,
        transaction_id: row.transaction_id,
        type: row.type,
        qty: row.qty,
        description: row.description,
        created_at: row.created_at,
        created_by: row.created_by,
        unit_name: row.unit_name,
        created_by_name: row.created_by_name
      }));

      return {
        data: history,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching stock history:', error);
      throw new HttpException(500, 'Internal server error while fetching stock history');
    }
  }
} 