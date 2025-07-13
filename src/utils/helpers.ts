import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
}

/**
 * Generate JWT token
 */
export const generateToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return (jwt as any).sign(payload, secret, { expiresIn });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return (jwt as any).verify(token, secret) as JwtPayload;
};

/**
 * Validate required fields in request body
 */
export const validateRequiredFields = (
  body: Record<string, any>,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
      missingFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Sanitize string input
 */
export const sanitizeString = (input: string): string => {
  return input.trim().toLowerCase();
}; 