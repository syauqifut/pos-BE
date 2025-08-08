import { z } from 'zod';

// Schema for creating a new conversion
export const createConversionSchema = z.object({
  product_id: z.number().int().positive('Product ID must be a positive number'),
  from_unit_id: z.number().int().positive('From unit ID must be a positive number'),
  to_unit_id: z.number().int().positive('To unit ID must be a positive number'),
  to_unit_qty: z.number().positive('To unit quantity must be a positive number'),
  to_unit_price: z.number().positive('To unit price must be a positive number'),
  type: z.enum(['purchase', 'sale']),
  is_default_purchase: z.boolean().optional().default(false),
  is_default_sale: z.boolean().optional().default(false),
  note: z.string().optional()
}).refine(data => 
  !(data.is_default_purchase && data.type !== 'purchase'),
  { message: 'Default purchase unit must be of type purchase', path: ['is_default_purchase'] }
).refine(data => 
  !(data.is_default_sale && data.type !== 'sale'),
  { message: 'Default sale unit must be of type sale', path: ['is_default_sale'] }
);

// Schema for updating a conversion
export const updateConversionSchema = z.object({
  product_id: z.number().int().positive('Product ID must be a positive number'),
  from_unit_id: z.number().int().positive('From unit ID must be a positive number'),
  to_unit_id: z.number().int().positive('To unit ID must be a positive number'),
  to_unit_qty: z.number().positive('To unit quantity must be a positive number'),
  to_unit_price: z.number().positive('To unit price must be a positive number'),
  type: z.enum(['purchase', 'sale']),
  is_default_purchase: z.boolean().optional().default(false),
  is_default_sale: z.boolean().optional().default(false),
  note: z.string().optional()
}).refine(data => 
  !(data.is_default_purchase && data.type !== 'purchase'),
  { message: 'Default purchase unit must be of type purchase', path: ['is_default_purchase'] }
).refine(data => 
  !(data.is_default_sale && data.type !== 'sale'),
  { message: 'Default sale unit must be of type sale', path: ['is_default_sale'] }
);

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