import { HttpException } from '../../../exceptions/HttpException';
import pool from '../../../db';

// Common interface for transaction items across different transaction types
export interface TransactionItemInput {
  product_id: number;
  unit_id: number;
  qty?: number;
  description?: string;
}

// Context for validation to allow type-specific logic if needed
export interface ValidationContext {
  type: 'sale' | 'purchase' | 'adjustment';
}

// Internal interfaces for database results
interface ProductResult {
  id: number;
  name: string;
  is_active: boolean;
}

interface UnitResult {
  id: number;
  name: string;
}

// SQL queries for batch validation
const validationQueries = {
  // Batch validate products exist and are active
  validateProducts: `
    SELECT id, name, is_active
    FROM products 
    WHERE id = ANY($1)
  `,

  // Batch validate units exist
  validateUnits: `
    SELECT id, name 
    FROM units 
    WHERE id = ANY($1)
  `,

  // Batch validate product-unit conversions exist
  validateConversions: `
    SELECT product_id, to_unit_id, id
    FROM conversions 
    WHERE (product_id, to_unit_id) = ANY($1) AND is_active = true
  `,

  // Get current stock quantity for a product and unit combination
  getCurrentStock: `
    SELECT 
      COALESCE(SUM(qty), 0) as current_stock
    FROM stocks 
    WHERE product_id = $1 AND unit_id = $2
  `,

  // Get existing transaction items for reversal
  getExistingItems: `
    SELECT id, product_id, unit_id, qty, description
    FROM transaction_items
    WHERE transaction_id = $1
    ORDER BY id
  `
};

/**
 * Validates transaction items for product existence, unit existence, and product-unit conversions
 * Uses batch queries for optimal performance
 */
export async function validateTransactionItems(
  items: TransactionItemInput[], 
  context: ValidationContext,
  client?: any
): Promise<void> {
  if (!items || items.length === 0) {
    return;
  }

  const dbClient = client || pool;

  // Extract unique product IDs and unit IDs for batch validation
  const uniqueProductIds = [...new Set(items.map(item => item.product_id))];
  const uniqueUnitIds = [...new Set(items.map(item => item.unit_id))];
  
  // Create array of [product_id, unit_id] pairs for conversion validation
  const productUnitPairs = items.map(item => `(${item.product_id},${item.unit_id})`);
  const uniqueProductUnitPairs = [...new Set(productUnitPairs)];

  try {
    // 1. Batch validate products exist and are active
    const productsResult = await dbClient.query(validationQueries.validateProducts, [uniqueProductIds]);
    const existingProducts = new Map<number, ProductResult>(
      productsResult.rows.map((row: any) => [row.id, row as ProductResult])
    );

    // Check for missing or inactive products
    for (const productId of uniqueProductIds) {
      const product = existingProducts.get(productId);
      if (!product) {
        throw new HttpException(400, `Product with ID ${productId} not found`);
      }
      if (product.is_active === false) {
        throw new HttpException(400, `Product "${product.name}" (ID: ${productId}) is inactive`);
      }
    }

    // 2. Batch validate units exist
    const unitsResult = await dbClient.query(validationQueries.validateUnits, [uniqueUnitIds]);
    const existingUnits = new Map<number, UnitResult>(
      unitsResult.rows.map((row: any) => [row.id, row as UnitResult])
    );

    // Check for missing units
    for (const unitId of uniqueUnitIds) {
      const unit = existingUnits.get(unitId);
      if (!unit) {
        throw new HttpException(400, `Unit with ID ${unitId} not found`);
      }
    }

    // 3. Batch validate product-unit conversions exist
    // Convert pairs back to the format expected by PostgreSQL
    const conversionPairs = uniqueProductUnitPairs.map(pair => pair.slice(1, -1)); // Remove parentheses
    const conversionsResult = await dbClient.query(validationQueries.validateConversions, [conversionPairs]);
    const existingConversions = new Set(
      conversionsResult.rows.map((row: any) => `${row.product_id}-${row.to_unit_id}`)
    );

    // Check for missing conversions
    for (const item of items) {
      const conversionKey = `${item.product_id}-${item.unit_id}`;
      if (!existingConversions.has(conversionKey)) {
        const product = existingProducts.get(item.product_id);
        const unit = existingUnits.get(item.unit_id);
        
        const productName = product ? product.name : `ID ${item.product_id}`;
        const unitName = unit ? unit.name : `ID ${item.unit_id}`;
        
        throw new HttpException(400, 
          `Unit "${unitName}" is not configured for product "${productName}". Please configure a conversion for this product-unit combination first.`
        );
      }
    }

  } catch (error) {
    // Re-throw HttpExceptions as-is, wrap other errors
    if (error instanceof HttpException) {
      throw error;
    }
    
    console.error('Error validating transaction items:', error);
    throw new HttpException(500, 'Internal server error while validating transaction items');
  }
}

/**
 * Validates a single transaction item (for cases where batch validation isn't needed)
 */
export async function validateSingleTransactionItem(
  item: TransactionItemInput, 
  context: ValidationContext,
  client?: any
): Promise<void> {
  return validateTransactionItems([item], context, client);
}

/**
 * Validates stock levels for adjustment CREATE operation
 * Ensures no stock would go below 0 after adjustment
 */
export async function validateAdjustmentStockForCreate(
  items: TransactionItemInput[], 
  client?: any
): Promise<void> {
  const dbClient = client || pool;

  for (const item of items) {
    // Get current stock for this product/unit combination
    const stockResult = await dbClient.query(validationQueries.getCurrentStock, [item.product_id, item.unit_id]);
    const currentStock = parseFloat(stockResult.rows[0].current_stock) || 0;
    
    // Calculate resulting stock after adjustment
    const resultingStock = currentStock + (item.qty || 0);
    
    // Check if resulting stock would be negative
    if (resultingStock < 0) {
      // Get product and unit names for better error message
      const productsResult = await dbClient.query(validationQueries.validateProducts, [[item.product_id]]);
      const unitsResult = await dbClient.query(validationQueries.validateUnits, [[item.unit_id]]);
      
      const product = productsResult.rows[0];
      const unit = unitsResult.rows[0];
      
      const productName = product ? product.name : `ID ${item.product_id}`;
      const unitName = unit ? unit.name : `ID ${item.unit_id}`;
      
      throw new HttpException(400, 
        `Stock for product "${productName}" with unit "${unitName}" would become negative (current: ${currentStock}, adjustment: ${item.qty}, resulting: ${resultingStock}). Adjustment rejected.`
      );
    }
  }
}

/**
 * Validates stock levels for adjustment UPDATE operation
 * Simulates reversing old adjustment and applying new one
 */
export async function validateAdjustmentStockForUpdate(
  transactionId: number, 
  newItems: TransactionItemInput[], 
  client?: any
): Promise<void> {
  const dbClient = client || pool;

  // Get existing items for this transaction
  const existingItemsResult = await dbClient.query(validationQueries.getExistingItems, [transactionId]);
  const existingItems = existingItemsResult.rows;
  
  // Create a map of existing items by product_id + unit_id for quick lookup
  const existingItemsMap = new Map<string, any>();
  existingItems.forEach((item: any) => {
    const key = `${item.product_id}-${item.unit_id}`;
    existingItemsMap.set(key, item);
  });
  
  // Validate each new item
  for (const newItem of newItems) {
    // Get current stock for this product/unit combination
    const stockResult = await dbClient.query(validationQueries.getCurrentStock, [newItem.product_id, newItem.unit_id]);
    const currentStock = parseFloat(stockResult.rows[0].current_stock) || 0;
    
    // Check if there's an existing item for this product/unit combination
    const key = `${newItem.product_id}-${newItem.unit_id}`;
    const existingItem = existingItemsMap.get(key);
    
    let resultingStock: number;
    
    if (existingItem) {
      // Simulate: current_stock - old_qty + new_qty
      resultingStock = currentStock - existingItem.qty + (newItem.qty || 0);
    } else {
      // No existing item for this product/unit, just add the new quantity
      resultingStock = currentStock + (newItem.qty || 0);
    }
    
    // Check if resulting stock would be negative
    if (resultingStock < 0) {
      // Get product and unit names for better error message
      const productsResult = await dbClient.query(validationQueries.validateProducts, [[newItem.product_id]]);
      const unitsResult = await dbClient.query(validationQueries.validateUnits, [[newItem.unit_id]]);
      
      const product = productsResult.rows[0];
      const unit = unitsResult.rows[0];
      
      const productName = product ? product.name : `ID ${newItem.product_id}`;
      const unitName = unit ? unit.name : `ID ${newItem.unit_id}`;
      
      const oldQty = existingItem ? existingItem.qty : 0;
      
      throw new HttpException(400, 
        `Stock for product "${productName}" with unit "${unitName}" would become negative (current: ${currentStock}, old adjustment: ${oldQty}, new adjustment: ${newItem.qty}, resulting: ${resultingStock}). Adjustment rejected.`
      );
    }
  }
} 