import { z } from 'zod';

// Schema for creating a new user
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(100, 'Name cannot exceed 100 characters').trim(),
  username: z.string().min(1, 'Username cannot be empty').max(50, 'Username cannot exceed 50 characters').trim(),
  password: z.string().min(3, 'Password must be at least 3 characters long'),
  role: z.enum(['admin', 'kasir'], { message: 'Role must be either "admin" or "kasir"' })
});

// Schema for updating a user
export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(100, 'Name cannot exceed 100 characters').trim(),
  username: z.string().min(1, 'Username cannot be empty').max(50, 'Username cannot exceed 50 characters').trim(),
  password: z.string().min(3, 'Password must be at least 3 characters long').optional(),
  role: z.enum(['admin', 'kasir'], { message: 'Role must be either "admin" or "kasir"' })
});

// Schema for path parameters
export const userParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive('Invalid user ID'))
});

// Export types
export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
export type UserParamsRequest = z.infer<typeof userParamsSchema>; 