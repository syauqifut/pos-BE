import { z } from 'zod';

// Schema for creating a new category
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(255, 'Name cannot exceed 255 characters').trim()
});

// Schema for updating a category
export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(255, 'Name cannot exceed 255 characters').trim()
});

// Schema for path parameters
export const categoryParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Invalid category ID'))
});

// Export types
export type CreateCategoryRequest = z.infer<typeof createCategorySchema>;
export type UpdateCategoryRequest = z.infer<typeof updateCategorySchema>;
export type CategoryParamsRequest = z.infer<typeof categoryParamsSchema>; 