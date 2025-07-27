/**
 * SQL queries for manufacturer operations
 */

export const manufacturerQueries = {
  // Get all manufacturers
  findAll: `
    SELECT 
      id,
      name
    FROM manufacturers
    ORDER BY id ASC
  `,

  // Get manufacturer by ID
  findById: `
    SELECT 
      id,
      name
    FROM manufacturers
    WHERE id = $1
  `,

  // Create new manufacturer
  create: `
    INSERT INTO manufacturers (name) 
    VALUES ($1) 
    RETURNING id, name
  `,

  // Update manufacturer
  update: `
    UPDATE manufacturers 
    SET name = $1 
    WHERE id = $2 
    RETURNING id, name
  `,

  // Delete manufacturer
  delete: `
    DELETE FROM manufacturers 
    WHERE id = $1 
    RETURNING id, name
  `,

  // Check if manufacturer exists
  checkExists: `
    SELECT EXISTS(SELECT 1 FROM manufacturers WHERE id = $1)
  `,

  // Check if manufacturer name exists (for duplicate prevention)
  checkNameExists: `
    SELECT EXISTS(SELECT 1 FROM manufacturers WHERE LOWER(name) = LOWER($1))
  `,

  // Check if manufacturer name exists excluding current ID (for update)
  checkNameExistsExcludingId: `
    SELECT EXISTS(SELECT 1 FROM manufacturers WHERE LOWER(name) = LOWER($1) AND id != $2)
  `
} as const; 