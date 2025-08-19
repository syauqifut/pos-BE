import { z } from 'zod';

// Query parameters schema for transaction list
export const transactionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  type: z.enum(['all', 'sale', 'purchase', 'adjustment']).default('all'),
  sortBy: z.enum(['time', 'transactionNo', 'type', 'user']).default('time'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Export types for use in controller
export type TransactionListQueryRequest = z.infer<typeof transactionListQuerySchema>;

// Response schema for validation (optional, for documentation purposes)
export const transactionListItemSchema = z.object({
  transactionNo: z.string(),
  type: z.enum(['sale', 'purchase', 'adjustment']),
  time: z.string(),
  totalItems: z.number(),
  user: z.string(),
  products: z.array(z.object({
    productName: z.string(),
    qty: z.number(),
    unit: z.string()
  }))
});

export const transactionListResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(transactionListItemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean()
  })
});
