/**
 * SQL queries for authentication operations
 */

export const authQueries = {
  // Find user by username
  findUserByUsername: `
    SELECT 
      id,
      username,
      password_hash,
      name,
      role,
      is_active,
      created_at,
      updated_at
    FROM users 
    WHERE username = $1 AND is_active = true
  `,

  // Find user by ID (for token validation)
  findUserById: `
    SELECT 
      id,
      username,
      name,
      role,
      is_active,
      created_at,
      updated_at
    FROM users 
    WHERE id = $1 AND is_active = true
  `,

  // Update user last login (optional)
  updateLastLogin: `
    UPDATE users 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = $1
  `
} as const; 