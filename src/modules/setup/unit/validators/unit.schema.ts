import { z } from 'zod';

// Schema for creating a new unit
export const createUnitSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(255, 'Name cannot exceed 255 characters').trim()
});

// Schema for updating a unit
export const updateUnitSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(255, 'Name cannot exceed 255 characters').trim()
});

// Schema for query parameters
export const unitQuerySchema = z.object({
  search: z.string().optional(),
  sort_by: z.enum(['name', 'id']).optional().default('name'),
  sort_order: z.enum(['ASC', 'DESC', 'asc', 'desc']).transform((val) => val.toUpperCase()).optional().default('ASC')
});

// Schema for path parameters
export const unitParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Invalid unit ID'))
});

// Export types
export type CreateUnitRequest = z.infer<typeof createUnitSchema>;
export type UpdateUnitRequest = z.infer<typeof updateUnitSchema>;
export type UnitQueryRequest = z.infer<typeof unitQuerySchema>;
export type UnitParamsRequest = z.infer<typeof unitParamsSchema>; 