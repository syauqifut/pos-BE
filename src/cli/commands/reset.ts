import db from '../../db';

export async function reset(): Promise<void> {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get all table names except 'users'
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name != 'users'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    
    if (tables.length === 0) {
      console.log('No tables found to reset (excluding users table)');
      return;
    }
    
    console.log(`Found ${tables.length} tables to reset:`);
    tables.forEach(table => console.log(`  - ${table}`));
    
    // Disable foreign key checks temporarily
    await client.query('SET session_replication_role = replica');
    
    // Truncate each table
    for (const table of tables) {
      try {
        await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        console.log(`Reset table: ${table}`);
      } catch (error) {
        console.error(`Failed to reset table ${table}:`, error);
        throw error;
      }
    }
    
    // Re-enable foreign key checks
    await client.query('SET session_replication_role = DEFAULT');
    
    await client.query('COMMIT');
    
    console.log(`\nSuccessfully reset ${tables.length} tables!`);
    console.log('Note: User table was preserved as requested.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction rolled back due to error:', error);
    throw error;
  } finally {
    client.release();
  }
}
