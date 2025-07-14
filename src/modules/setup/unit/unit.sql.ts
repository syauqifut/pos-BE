/**
 * SQL queries for unit operations
 */

export const unitQueries = {
  // Get all units
  findAll: `
    SELECT 
      id,
      name
    FROM units
    ORDER BY id ASC
  `,

  // Get unit by ID
  findById: `
    SELECT 
      id,
      name
    FROM units
    WHERE id = $1
  `,

  // Create new unit
  create: `
    INSERT INTO units (name) 
    VALUES ($1) 
    RETURNING id, name
  `,

  // Update unit
  update: `
    UPDATE units 
    SET name = $1 
    WHERE id = $2 
    RETURNING id, name
  `,

  // Delete unit
  delete: `
    DELETE FROM units 
    WHERE id = $1 
    RETURNING id, name
  `,

  // Check if unit exists
  checkExists: `
    SELECT EXISTS(SELECT 1 FROM units WHERE id = $1)
  `,

  // Check if unit name exists (for duplicate prevention)
  checkNameExists: `
    SELECT EXISTS(SELECT 1 FROM units WHERE LOWER(name) = LOWER($1))
  `,

  // Check if unit name exists excluding current ID (for update)
  checkNameExistsExcludingId: `
    SELECT EXISTS(SELECT 1 FROM units WHERE LOWER(name) = LOWER($1) AND id != $2)
  `
} as const; 