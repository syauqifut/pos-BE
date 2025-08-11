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

export interface ProductWithStockPerUnit {
  product_id: number;
  product_name: string;
  sku?: string;
  barcode?: string;
  image_url?: string;
  category_name?: string;
  category_id?: number;
  manufacturer_name?: string;
  manufacturer_id?: number;
  stock: {
    unit_id: number;
    unit_name: string;
    stock: number;
    is_default: boolean;
  }[];
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

  /**
   * Get all products with stock information for each unit/conversion
   */
  async getAllProductsWithStockPerUnit(options: FindAllStockOptions = {}): Promise<ProductWithStockPerUnit[]> {
    try {
      // Get all products with stock result using existing method
      const stockResult = await this.findAll(options);
      
      // Transform the data to include stock for all conversions
      const productsWithStockPerUnit: ProductWithStockPerUnit[] = [];
      
      for (const productStock of stockResult.data) {
        // Get all conversions for this product
        const conversions = await this.getProductConversions(productStock.product_id);
        
        // Use Map to ensure no duplicate unit_id
        const stockPerUnitMap = new Map<number, { unit_id: number; unit_name: string; stock: number; is_default: boolean }>();
        
        // Use the unit_id from productStock as the default unit
        const defaultUnitId = productStock.unit_id;
        
        for (const conversion of conversions) {
          let stockInThisUnit: number;
          
          if (defaultUnitId) {
            // Calculate stock based on the default unit from productStock
            stockInThisUnit = this.calculateStockInUnit(
              productStock.stock, 
              defaultUnitId, 
              conversion.to_unit_id, 
              conversion.to_unit_qty
            );
          } else {
            // If no default unit, use the original calculation
            stockInThisUnit = this.calculateStockInUnit(
              productStock.stock, 
              conversion.from_unit_id, 
              conversion.to_unit_id, 
              conversion.to_unit_qty
            );
          }
          
          // Only add if unit_id doesn't exist in map, or update if it exists
          stockPerUnitMap.set(conversion.to_unit_id, {
            unit_id: conversion.to_unit_id,
            unit_name: conversion.to_unit_name,
            stock: stockInThisUnit,
            is_default: conversion.is_default_sale || false
          });
        }
        
        // Convert Map to array
        const stockPerUnit = Array.from(stockPerUnitMap.values());
        
        // Create product object with stock per unit
        const productWithStock: ProductWithStockPerUnit = {
          product_id: productStock.product_id,
          product_name: productStock.product_name,
          sku: productStock.sku,
          barcode: productStock.barcode,
          image_url: productStock.image_url,
          category_name: productStock.category_name,
          category_id: productStock.category_id,
          manufacturer_name: productStock.manufacturer_name,
          manufacturer_id: productStock.manufacturer_id,
          stock: stockPerUnit
        };
        
        productsWithStockPerUnit.push(productWithStock);
      }
      
      return productsWithStockPerUnit;
    } catch (error) {
      console.error('Error fetching products with stock per unit:', error);
      throw new HttpException(500, 'Internal server error while fetching products with stock per unit');
    }
  }

  /**
   * Get all conversions for a specific product
   */
  private async getProductConversions(productId: number): Promise<any[]> {
    try {
      const query = `
        SELECT 
          c.id,
          c.from_unit_id,
          c.to_unit_id,
          c.to_unit_qty,
          c.to_unit_price,
          c.type,
          c.is_default_sale,
          fu.name as from_unit_name,
          tu.name as to_unit_name
        FROM conversions c
        JOIN units fu ON c.from_unit_id = fu.id
        JOIN units tu ON c.to_unit_id = tu.id
        WHERE c.product_id = $1 AND c.is_active = true
        ORDER BY c.type, c.to_unit_price
      `;
      
      const result = await pool.query(query, [productId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching product conversions:', error);
      throw new HttpException(500, 'Internal server error while fetching product conversions');
    }
  }

  /**
   * Calculate stock in a specific unit based on conversion rate
   */
  private calculateStockInUnit(
    baseStock: number, 
    fromUnitId: number, 
    toUnitId: number, 
    conversionRate: number
  ): number {
    // If converting to the same unit, return the base stock
    if (fromUnitId === toUnitId) {
      return baseStock;
    }
    
    // Calculate stock in the target unit using conversion rate
    return Math.round(baseStock * conversionRate);
  }
} 