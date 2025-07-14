/**
 * SQL queries for user operations
 */

export const userQueries = {
  // Get all active users
  findAllActive: `
    SELECT 
      id,
      name,
      username,
      role,
      is_active,
      created_at,
      updated_at
    FROM users
    WHERE is_active = true
    ORDER BY id ASC
  `,

  // Get all inactive users
  findAllInactive: `
    SELECT 
      id,
      name,
      username,
      role,
      is_active,
      created_at,
      updated_at
    FROM users
    WHERE is_active = false
    ORDER BY id ASC
  `,

  // Get active user by ID
  findActiveById: `
    SELECT 
      id,
      name,
      username,
      role,
      is_active,
      created_at,
      updated_at
    FROM users
    WHERE id = $1 AND is_active = true
  `,

  // Get user by ID (including inactive)
  findById: `
    SELECT 
      id,
      name,
      username,
      role,
      is_active,
      created_at,
      updated_at
    FROM users
    WHERE id = $1
  `,

  // Get user by ID with password (for updates)
  findByIdWithPassword: `
    SELECT 
      id,
      name,
      username,
      password,
      role,
      is_active,
      created_at,
      updated_at
    FROM users
    WHERE id = $1
  `,

  // Create new user
  create: `
    INSERT INTO users (name, username, password, role, is_active, created_at, updated_at) 
    VALUES ($1, $2, $3, $4, true, NOW(), NOW()) 
    RETURNING id, name, username, role, is_active, created_at, updated_at
  `,

  // Update user without password
  updateWithoutPassword: `
    UPDATE users 
    SET name = $1, username = $2, role = $3, updated_at = NOW()
    WHERE id = $4 
    RETURNING id, name, username, role, is_active, created_at, updated_at
  `,

  // Update user with password
  updateWithPassword: `
    UPDATE users 
    SET name = $1, username = $2, password = $3, role = $4, updated_at = NOW()
    WHERE id = $5 
    RETURNING id, name, username, role, is_active, created_at, updated_at
  `,

  // Soft delete user (set is_active = false)
  softDelete: `
    UPDATE users 
    SET is_active = false, updated_at = NOW()
    WHERE id = $1 
    RETURNING id, name, username, role, is_active, created_at, updated_at
  `,

  // Toggle user activation
  toggleActivation: `
    UPDATE users 
    SET is_active = NOT is_active, updated_at = NOW()
    WHERE id = $1 
    RETURNING id, name, username, role, is_active, created_at, updated_at
  `,

  // Check if user exists
  checkExists: `
    SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)
  `,

  // Check if username exists (for duplicate prevention)
  checkUsernameExists: `
    SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(username) = LOWER($1))
  `,

  // Check if username exists excluding current ID (for update)
  checkUsernameExistsExcludingId: `
    SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) AND id != $2)
  `
} as const; 