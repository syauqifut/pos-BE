/**
 * SQL queries for category operations
 */

export const categoryQueries = {
  // Get all categories
  findAll: `
    SELECT 
      id,
      name
    FROM categories
    ORDER BY id ASC
  `,

  // Get category by ID
  findById: `
    SELECT 
      id,
      name
    FROM categories
    WHERE id = $1
  `,

  // Create new category
  create: `
    INSERT INTO categories (name) 
    VALUES ($1) 
    RETURNING id, name
  `,

  // Update category
  update: `
    UPDATE categories 
    SET name = $1 
    WHERE id = $2 
    RETURNING id, name
  `,

  // Delete category
  delete: `
    DELETE FROM categories 
    WHERE id = $1 
    RETURNING id, name
  `,

  // Check if category exists
  checkExists: `
    SELECT EXISTS(SELECT 1 FROM categories WHERE id = $1)
  `,

  // Check if category name exists (for duplicate prevention)
  checkNameExists: `
    SELECT EXISTS(SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1))
  `,

  // Check if category name exists excluding current ID (for update)
  checkNameExistsExcludingId: `
    SELECT EXISTS(SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2)
  `
} as const; 