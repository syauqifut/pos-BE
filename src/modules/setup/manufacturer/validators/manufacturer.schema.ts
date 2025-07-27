import { z } from 'zod';

// Schema for creating a new manufacturer
export const createManufacturerSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(255, 'Name cannot exceed 255 characters').trim()
});

// Schema for updating a manufacturer
export const updateManufacturerSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(255, 'Name cannot exceed 255 characters').trim()
});

// Schema for path parameters
export const manufacturerParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Invalid manufacturer ID'))
});

// Export types
export type CreateManufacturerRequest = z.infer<typeof createManufacturerSchema>;
export type UpdateManufacturerRequest = z.infer<typeof updateManufacturerSchema>;
export type ManufacturerParamsRequest = z.infer<typeof manufacturerParamsSchema>; 