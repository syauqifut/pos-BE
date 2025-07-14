/**
 * SQL queries for manufacture operations
 */

export const manufactureQueries = {
  // Get all manufactures
  findAll: `
    SELECT 
      id,
      name
    FROM manufacturers
    ORDER BY id ASC
  `,

  // Get manufacture by ID
  findById: `
    SELECT 
      id,
      name
    FROM manufacturers
    WHERE id = $1
  `,

  // Create new manufacture
  create: `
    INSERT INTO manufacturers (name) 
    VALUES ($1) 
    RETURNING id, name
  `,

  // Update manufacture
  update: `
    UPDATE manufacturers 
    SET name = $1 
    WHERE id = $2 
    RETURNING id, name
  `,

  // Delete manufacture
  delete: `
    DELETE FROM manufacturers 
    WHERE id = $1 
    RETURNING id, name
  `,

  // Check if manufacture exists
  checkExists: `
    SELECT EXISTS(SELECT 1 FROM manufacturers WHERE id = $1)
  `,

  // Check if manufacture name exists (for duplicate prevention)
  checkNameExists: `
    SELECT EXISTS(SELECT 1 FROM manufacturers WHERE LOWER(name) = LOWER($1))
  `,

  // Check if manufacture name exists excluding current ID (for update)
  checkNameExistsExcludingId: `
    SELECT EXISTS(SELECT 1 FROM manufacturers WHERE LOWER(name) = LOWER($1) AND id != $2)
  `
} as const; 