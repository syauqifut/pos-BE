import { z } from 'zod';

// Schema for purchase item
export const purchaseItemSchema = z.object({
  product_id: z.number().int().positive('Product ID must be a positive number'),
  unit_id: z.number().int().positive('Unit ID must be a positive number'),
  qty: z.number().positive('Quantity must be positive for purchases')
});

// Schema for creating purchase transaction
export const createPurchaseSchema = z.object({
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
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required')
});

// Schema for updating purchase transaction (no 'no' or 'type' allowed)
export const updatePurchaseSchema = z.object({
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
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required')
});

// Schema for purchase ID parameter
export const purchaseParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Purchase ID must be a positive number'))
});

// Type definitions for TypeScript
export type PurchaseItemRequest = z.infer<typeof purchaseItemSchema>;
export type CreatePurchaseRequest = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseRequest = z.infer<typeof updatePurchaseSchema>;
export type PurchaseParamsRequest = z.infer<typeof purchaseParamsSchema>; 