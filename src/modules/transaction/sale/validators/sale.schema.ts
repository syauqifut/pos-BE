import { z } from 'zod';

// Schema for sale item
export const saleItemSchema = z.object({
  product_id: z.number().int().positive('Product ID must be a positive number'),
  unit_id: z.number().int().positive('Unit ID must be a positive number'),
  qty: z.number().positive('Quantity must be positive for sales')
});

// Schema for creating sale transaction
export const createSaleSchema = z.object({
  date: z.string()
    .optional()
    .default(() => new Date().toISOString().split('T')[0])
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: 'Date must be a valid date'
    })
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      return date <= today;
    }, {
      message: 'Date cannot be in the future'
    }),
  description: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  total_paid: z.number().min(0, 'Total paid must be non-negative'),
  payment_type: z.enum(['cash', 'card', 'transfer'], {
    message: 'Payment type must be cash, card, or transfer'
  })
});

// Schema for updating sale transaction (no 'no' or 'type' allowed)
export const updateSaleSchema = z.object({
  date: z.string()
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: 'Date must be a valid date'
    })
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      return date <= today;
    }, {
      message: 'Date cannot be in the future'
    }),
  description: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  total_paid: z.number().min(0, 'Total paid must be non-negative'),
  payment_type: z.enum(['cash', 'card', 'transfer'], {
    message: 'Payment type must be cash, card, or transfer'
  })
});

// Schema for sale ID parameter
export const saleParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Sale ID must be a positive number'))
});

// Type definitions for TypeScript
export type SaleItemRequest = z.infer<typeof saleItemSchema>;
export type CreateSaleRequest = z.infer<typeof createSaleSchema>;
export type UpdateSaleRequest = z.infer<typeof updateSaleSchema>;
export type SaleParamsRequest = z.infer<typeof saleParamsSchema>; 