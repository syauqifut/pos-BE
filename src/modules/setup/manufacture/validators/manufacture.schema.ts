import { z } from 'zod';

// Schema for creating a new manufacture
export const createManufactureSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(255, 'Name cannot exceed 255 characters').trim()
});

// Schema for updating a manufacture
export const updateManufactureSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(255, 'Name cannot exceed 255 characters').trim()
});

// Schema for path parameters
export const manufactureParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Invalid manufacture ID'))
});

// Export types
export type CreateManufactureRequest = z.infer<typeof createManufactureSchema>;
export type UpdateManufactureRequest = z.infer<typeof updateManufactureSchema>;
export type ManufactureParamsRequest = z.infer<typeof manufactureParamsSchema>; 