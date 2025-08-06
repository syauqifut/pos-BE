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
  manufacturer_name?: string;
  stock: number;
  last_updated_at?: Date;
  stock_status: string;
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
      manufacturer_name: stock.manufacturer_name,
      stock: stock.stock,
      last_updated_at: stock.last_updated_at,
      stock_status: this.getStockStatus(stock.stock)
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
   * Get stock status based on quantity
   */
  private getStockStatus(stock: number): string {
    if (stock <= 0) return 'out_of_stock';
    if (stock <= 10) return 'low_stock';
    return 'in_stock';
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
      const groupByClause = 'GROUP BY p.id, p.name, p.sku, p.barcode, p.image_url, c.id, c.name, m.id, m.name';

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
   * Transform single product stock data for API response
   */
  private transformSingleProductStock(stock: ProductStock): StockProductData {
    return {
      product_id: stock.product_id,
      product_name: stock.product_name,
      category_name: stock.category_name,
      manufacturer_name: stock.manufacturer_name,
      stock: stock.stock,
      last_updated_at: stock.last_updated_at,
      stock_status: this.getStockStatus(stock.stock)
    };
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
          manufacturer_name: product.manufacturer?.name,
          stock: 0,
          last_updated_at: undefined,
          stock_status: 'out_of_stock'
        };
      }
      
      // Return single object with stock data
      return this.transformSingleProductStock(stockResult[0]);
    } catch (error) {
      console.error('Error fetching current stock:', error);
      throw new HttpException(500, 'Internal server error while fetching current stock');
    }
  }
} 