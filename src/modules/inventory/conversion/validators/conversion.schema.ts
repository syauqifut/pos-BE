import { z } from 'zod';

// Schema for creating a new conversion
export const createConversionSchema = z.object({
  product_id: z.number().int().positive('Product ID must be a positive number'),
  unit_id: z.number().int().positive('Unit ID must be a positive number'),
  unit_qty: z.number().positive('Unit quantity must be a positive number'),
  unit_price: z.number().positive('Unit price must be a positive number'),
  type: z.enum(['purchase', 'sale']),
  is_default: z.boolean().optional().default(false),
  note: z.string().optional()
});

// Schema for updating a conversion
export const updateConversionSchema = z.object({
  product_id: z.number().int().positive('Product ID must be a positive number'),
  unit_id: z.number().int().positive('Unit ID must be a positive number'),
  unit_qty: z.number().positive('Unit quantity must be a positive number'),
  unit_price: z.number().positive('Unit price must be a positive number'),
  type: z.enum(['purchase', 'sale']),
  is_default: z.boolean().optional().default(false),
  note: z.string().optional()
});

// Schema for conversion parameters (ID)
export const conversionParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('ID must be a positive number'))
});

// Schema for product ID parameters  
export const productParamsSchema = z.object({
  productId: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Product ID must be a positive number'))
});

// Schema for product ID and type parameters  
export const productAndTypeParamsSchema = z.object({
  productId: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Product ID must be a positive number')),
  type: z.enum(['purchase', 'sale', 'all'])
});

// Type definitions for TypeScript
export type CreateConversionRequest = z.infer<typeof createConversionSchema>;
export type UpdateConversionRequest = z.infer<typeof updateConversionSchema>;
export type ConversionParamsRequest = z.infer<typeof conversionParamsSchema>;
export type ProductParamsRequest = z.infer<typeof productParamsSchema>; 