import { z } from 'zod';

// Schema for creating a new product
export const createProductSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').trim(),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  image_url: z.string().optional(),
  category: z.object({
    id: z.number().int().positive('Category ID must be a positive number'),
    name: z.string()
  }).optional(),
  manufacturer: z.object({
    id: z.number().int().positive('Manufacturer ID must be a positive number'),
    name: z.string()
  }).optional()
});

// Schema for updating a product
export const updateProductSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').trim().optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  image_url: z.string().optional(),
  category: z.object({
    id: z.number().int().positive('Category ID must be a positive number'),
    name: z.string()
  }).optional(),
  manufacturer: z.object({
    id: z.number().int().positive('Manufacturer ID must be a positive number'),
    name: z.string()
  }).optional()
});

// Schema for query parameters
export const productQuerySchema = z.object({
  search: z.string().optional(),
  category_id: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive()).optional(),
  manufacturer_id: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive()).optional(),
  sort_by: z.enum(['name', 'description', 'category', 'manufacturer']).optional().default('name'),
  sort_order: z.enum(['ASC', 'DESC', 'asc', 'desc']).transform((val) => val.toUpperCase()).optional(),
  page: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Page must be a positive number')).optional(),
  limit: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Limit must be a positive number')).optional()
});

// Schema for path parameters
export const productParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Invalid product ID'))
});

// Export types
export type CreateProductRequest = z.infer<typeof createProductSchema>;
export type UpdateProductRequest = z.infer<typeof updateProductSchema>;
export type ProductQueryRequest = z.infer<typeof productQuerySchema>;
export type ProductParamsRequest = z.infer<typeof productParamsSchema>; 