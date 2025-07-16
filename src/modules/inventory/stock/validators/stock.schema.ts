import { z } from 'zod';

// Schema for stock query parameters
export const stockQuerySchema = z.object({
  search: z.string().optional(),
  category_id: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive()).optional(),
  manufacture_id: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive()).optional(),
  sort_by: z.enum(['name', 'category', 'manufacture', 'stock']).optional().default('name'),
  sort_order: z.enum(['ASC', 'DESC', 'asc', 'desc']).transform((val) => val.toUpperCase()).optional().default('ASC'),
  page: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Page must be a positive number')).optional().default(1),
  limit: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Limit must be a positive number')).optional().default(10)
});



// Schema for product ID parameters
export const productParamsSchema = z.object({
  productId: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Product ID must be a positive number'))
});

// Schema for stock history query parameters
export const stockHistoryQuerySchema = z.object({
  page: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Page must be a positive number')).optional().default(1),
  limit: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Limit must be a positive number')).optional().default(20)
});

// Type definitions for TypeScript
export type StockQueryRequest = z.infer<typeof stockQuerySchema>;
export type ProductParamsRequest = z.infer<typeof productParamsSchema>;
export type StockHistoryQueryRequest = z.infer<typeof stockHistoryQuerySchema>; 