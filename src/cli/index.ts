#!/usr/bin/env node

import { Command } from 'commander';
import { importProducts } from './commands/import-products';
import { reset } from './commands/reset';

const program = new Command();

// program
//   .name('pos-cli')
//   .description('CLI tool for POS Backend operations')
//   .version('1.0.0');

program
  .command('import:products')
  .description('Import products from Excel file')
  .action(async () => {
    try {
      await importProducts();
      console.log('Products imported successfully!');
      process.exit(0);
    } catch (error) {
      console.error('Error importing products:', error);
      process.exit(1);
    }
  });

program
  .command('reset')
  .description('Reset all tables except users table')
  .action(async () => {
    try {
      await reset();
      console.log('Database reset successfully!');
      process.exit(0);
    } catch (error) {
      console.error('Error resetting database:', error);
      process.exit(1);
    }
  });

program.parse();
