import { z } from 'zod';

// Schema for adjustment item
export const adjustmentItemSchema = z.object({
  product_id: z.number().int().positive('Product ID must be a positive number'),
  unit_id: z.number().int().positive('Unit ID must be a positive number'),
  qty: z.number().refine((val) => val !== 0, {
    message: 'Quantity cannot be zero'
  })
});

// Schema for creating adjustment transaction
export const createAdjustmentSchema = z.object({
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
  description: z.string().min(1, 'Description is required').trim(),
  items: z.array(adjustmentItemSchema).min(1, 'At least one item is required')
});

// Schema for updating adjustment transaction (no 'no' or 'type' allowed)
export const updateAdjustmentSchema = z.object({
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
  description: z.string().min(1, 'Description is required').trim(),
  items: z.array(adjustmentItemSchema).min(1, 'At least one item is required')
});

// Schema for adjustment ID parameter
export const adjustmentParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Adjustment ID must be a positive number'))
});

// Type definitions for TypeScript
export type AdjustmentItemRequest = z.infer<typeof adjustmentItemSchema>;
export type CreateAdjustmentRequest = z.infer<typeof createAdjustmentSchema>;
export type UpdateAdjustmentRequest = z.infer<typeof updateAdjustmentSchema>;
export type AdjustmentParamsRequest = z.infer<typeof adjustmentParamsSchema>; 