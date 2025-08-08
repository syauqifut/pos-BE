import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';
import { StockRepository, StockItem, StockHistoryItem, ProductStock } from './stock.repository';
import { ProductRepository } from '../../setup/product/product.repository';

export interface FindAllStockOptions {
  search?: string;
  category_id?: number;
  manufacturer_id?: number;
  sort_by?: 'code' | 'name' | 'category' | 'manufacturer' | 'stock';
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

export interface StockProductData {
  product_id: number;
  product_name: string;
  category_name?: string;
  category_id?: number;
  manufacturer_name?: string;
  manufacturer_id?: number;
  stock: number;
  last_updated_at?: Date;
  unit_id?: number;
  unit_name?: string;
}

export class StockService {
  /**
   * Transform stock data for API response
   */
  private transformStockData(stock: StockItem): any {
    return {
      product_id: stock.product_id,
      product_name: stock.product_name,
      sku: stock.sku,
      barcode: stock.barcode,
      image_url: stock.image_url,
      category_name: stock.category_name,
      category_id: stock.category_id,
      manufacturer_name: stock.manufacturer_name,
      manufacturer_id: stock.manufacturer_id,
      stock: stock.stock,
      last_updated_at: stock.last_updated_at,
      unit_id: stock.unit_id,
      unit_name: stock.unit_name,
    };
  }

  /**
   * Transform stock history data for API response
   */
  private transformStockHistoryData(history: StockHistoryItem): any {
    return {
      id: history.id,
      product_id: history.product_id,
      transaction_id: history.transaction_id,
      type: history.type,
      qty: history.qty,
      description: history.description,
      created_at: history.created_at,
      created_by: history.created_by,
      unit_name: history.unit_name,
      created_by_name: history.created_by_name,
      type_label: this.getTransactionTypeLabel(history.type)
    };
  }

  /**
   * Get human-readable transaction type label
   */
  private getTransactionTypeLabel(type: string): string {
    switch (type) {
      case 'sale': return 'Sale';
      case 'purchase': return 'Purchase';
      case 'adjustment': return 'Adjustment';
      default: return type;
    }
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

    // Filter by manufacturer_id
    if (options.manufacturer_id) {
      paramCount++;
      conditions.push(`p.manufacture_id = $${paramCount}`);
      values.push(options.manufacturer_id);
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
        orderColumn = 'LOWER(c.name)';
        break;
      case 'manufacturer':
        orderColumn = 'LOWER(m.name)';
        break;
      case 'name':
        orderColumn = 'LOWER(p.name)';
        break;
      case 'code':
        orderColumn = 'LOWER(p.sku)';
        break;
      default:
        orderColumn = 'LOWER(p.name)';
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
      const groupByClause = 'GROUP BY p.id, p.name, p.sku, p.barcode, p.image_url, c.id, c.name, m.id, m.name, ds.to_unit_id, u.name';

      // Get total count for pagination
      const total = await StockRepository.countAllProducts(pool, whereClause, values);

      // Get paginated results
      const stocks = await StockRepository.findAll(pool, whereClause, values, groupByClause, orderClause, limit, offset);

      // Transform the data for API response
      const transformedData = stocks.map(stock => this.transformStockData(stock));

      return {
        data: transformedData,
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
      return await StockRepository.getCurrentStockByProduct(pool, productId);
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
      const total = await StockRepository.countStockHistory(pool, productId);

      // Get paginated history
      const history = await StockRepository.getStockHistory(pool, productId, limit, offset);

      // Transform the data for API response
      const transformedData = history.map(item => this.transformStockHistoryData(item));

      return {
        data: transformedData,
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

  /**
   * Get current stock for a specific product
   */
  async getCurrentStock(productId: number): Promise<StockProductData> {
    try {
      const product = await ProductRepository.findById(pool, productId);
      if (!product) {
        throw new HttpException(404, 'Product not found');
      }
      
      const stockResult = await this.getCurrentStockByProduct(productId);
      
      // If no stock data found, return basic product info with empty stock
      if (stockResult.length === 0) {
        return {
          product_id: product.id,
          product_name: product.name,
          category_name: product.category?.name,
          category_id: product.category?.id,
          manufacturer_name: product.manufacturer?.name,
          manufacturer_id: product.manufacturer?.id,
          stock: 0,
          last_updated_at: undefined,
          unit_id: undefined,
          unit_name: undefined,
        };
      }
      
      // Return single object with stock data
      const stockData = stockResult[0];
      return {
        product_id: stockData.product_id,
        product_name: stockData.product_name,
        category_name: stockData.category_name,
        category_id: product.category?.id,
        manufacturer_name: stockData.manufacturer_name,
        manufacturer_id: product.manufacturer?.id,
        stock: stockData.stock,
        last_updated_at: stockData.last_updated_at,
        unit_id: stockData.unit_id,
        unit_name: stockData.unit_name
      };
    } catch (error) {
      console.error('Error fetching current stock:', error);
      throw new HttpException(500, 'Internal server error while fetching current stock');
    }
  }

  /**
   * Get all product with stock result
   */
  async getAllProductWithStockResult(options: FindAllStockOptions): Promise<PaginatedResult<StockProductData>> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const offset = (page - 1) * limit;

      const { whereClause, values } = this.buildWhereClause(options);
      const orderClause = this.buildOrderClause(options);
      const groupByClause = 'GROUP BY p.id, p.name, p.sku, p.barcode, p.image_url, c.id, c.name, m.id, m.name, ds.to_unit_id, u.name';

      // Get total count for pagination
      const total = await StockRepository.countAllProducts(pool, whereClause, values);

      // Get paginated results
      const stocks = await StockRepository.findAll(pool, whereClause, values, groupByClause, orderClause, limit, offset);

      // Transform the data for API response
      const transformedData = stocks.map(stock => this.transformStockData(stock));

      return {
        data: transformedData,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching all product with stock result:', error);
      throw new HttpException(500, 'Internal server error while fetching all product with stock result');
    }
  }
} 