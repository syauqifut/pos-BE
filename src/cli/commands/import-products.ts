import * as XLSX from 'xlsx';
import db from '../../db';

interface ProductRow {
  name: string;
  category: string;
  manufacturer: string;
}

// Global mapping variables
let categoryMapping: { [key: string]: number } = {};
let manufacturerMapping: { [key: string]: number } = {};
let unitMapping: { [key: string]: number } = {};

export async function importProducts(): Promise<void> {
  const filePath = 'data/products.xlsx';
  
  // Read Excel file
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  if (!worksheet) {
    throw new Error('Sheet not found');
  }
  
  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  if (data.length < 2) {
    throw new Error('Excel file must have at least 2 rows (header + data)');
  }
  
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Initialize master data within the same transaction
    await initMasterData(client, data);
    
    //if init failed, exit
    if (!categoryMapping || !manufacturerMapping || !unitMapping) {
      throw new Error('Failed to initialize master data');
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Parse data rows starting from row 2
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      try {
        const productId = await insertProduct(client, row);
        if (productId) {
          successCount++;
          await processUnitConversionProduct(client, row, productId);
        }
      } catch (productError) {
        errorCount++;
        const errorMsg = `Product ${i}: ${String(row[0] || '').trim()} - ${productError instanceof Error ? productError.message : 'Unknown error'}`;
        errors.push(errorMsg);
        // If any product fails, rollback the entire transaction
        throw new Error(`Transaction failed at product ${i}: ${errorMsg}`);
      }
    }
    
    // If we reach here, all operations succeeded
    await client.query('COMMIT');
    
    console.log(`\nImport completed successfully!`);
    console.log(`Successfully imported: ${successCount} products`);
    console.log(`Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log(`\nError Details:`);
      errors.forEach(error => console.log(`  ${error}`));
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction rolled back due to error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function initMasterData(client: any, data: any[][]): Promise<void> {
  const categoriesSet = new Set<string>();
  const manufacturersSet = new Set<string>();
  const unitsSet = new Set<string>();
  // console.log('Data:', data);
  // Parse data rows starting from row 2
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const category = String(row[2] || '').trim();
    const manufacturer = String(row[3] || '').trim();
    
    if (category) categoriesSet.add(category);
    if (manufacturer) manufacturersSet.add(manufacturer);

    for (let j = 5; j < row.length; j += 3) {
      const unitColomn = String(row[j] || '').trim();
      if (unitColomn) unitsSet.add(__getUnitExtracted(unitColomn, j).name);
    }
  }

  // Process categories
  await processMasterData(client, categoriesSet, 'category', categoryMapping);
  
  // Process manufacturers
  await processMasterData(client, manufacturersSet, 'manufacturer', manufacturerMapping);
  
  // Process units
  await processMasterData(client, unitsSet, 'unit', unitMapping);
}

async function insertProduct(client: any, data: any[]): Promise<number | undefined> {
    const categoryValue = String(data[2] || '').trim();
    const manufacturerValue = String(data[3] || '').trim();
    const category_id = categoryValue ? categoryMapping[categoryValue] : null;
    const manufacturer_id = manufacturerValue ? manufacturerMapping[manufacturerValue] : null;

    const product = {
      name: String(data[0] || '').trim(),
      category_id: category_id,
      manufacturer_id: manufacturer_id
    };

    const productResult = await client.query(
      'INSERT INTO products (name, category_id, manufacturer_id) VALUES ($1, $2, $3) RETURNING id',
      [product.name, product.category_id, product.manufacturer_id]
    );

    return productResult.rows[0].id;
}

async function processUnitConversionProduct(client: any, row: any[], productId: number) {
  let unitProductData = [];
  const seenUnitTypes = new Set<string>(); // Track unit+type combinations
  
  for (let j = 5; j < row.length; j += 3) {
    // Check if we have at least 3 more columns available
    if (j + 2 < row.length) {
      const unit = String(row[j] || '').trim();
      const qty = String(row[j + 1] || '').trim();
      const price = String(row[j + 2] || '').trim();
      let type = 'sale';
      if ([5].includes(j)) {
        type = 'purchase';
      }
      if (![5,8,11].includes(j)) {
        if (String(row[j] || '').includes('beli')) {
          type = 'purchase';
        } else if (String(row[j] || '').includes('jual')) {
          type = 'sale';
        } else {
          type = 'sale';
        }
      }
      
      // Only add if unit is not empty
      if (unit && qty && price) {
        // Extract the clean unit name and type using __getUnitExtracted
        const extractedUnit = __getUnitExtracted(unit, j);
        // Overwrite type with the result from __getUnitExtracted
        type = extractedUnit.type;
        
        // Create unique key for unit+type combination
        const unitTypeKey = `${extractedUnit.name}_${type}`;
        
        // Check if this unit+type combination already exists
        if (seenUnitTypes.has(unitTypeKey)) {
          console.log(`Skipping duplicate unit+type combination: ${unitTypeKey} for product ${productId}`);
          continue; // Skip this duplicate
        }
        
        // Check if this type is the first occurrence for isDefault
        const typeKey = `type_${type}`;
        const isDefault = !seenUnitTypes.has(typeKey);
        
        if (isDefault) {
          seenUnitTypes.add(typeKey);
        }
        
        // Mark this unit+type combination as seen
        seenUnitTypes.add(unitTypeKey);
        
        unitProductData.push({
          unit: extractedUnit.name, // Use the cleaned unit name
          qty: qty,
          price: price,
          type: type,
          default: isDefault
        });
      }
    }
  }
  
  // Process each unit conversion sequentially to avoid race conditions
  for (const item of unitProductData) {
    await insertUnitConversionProduct(client, item, productId);
  }
  // console.log(unitProductData);
  // process.exit(0);
  // return unitProductData;
}

async function insertUnitConversionProduct(client: any, item: any, productId: number) {
  const toUnitId = unitMapping[item.unit];
  
  // Validate that unit exists in mapping
  if (!toUnitId) {
    throw new Error(`Unit "${item.unit}" not found in unit mapping. Available units: ${Object.keys(unitMapping).join(', ')}`);
  }
  
  const toUnitQty = item.qty;
  const toUnitPrice = item.price;
  const type = item.type;
  const isDefault = item.default;
  const createdBy = 1;
  const isActive = true;
  // console.log(toUnitId, toUnitQty, toUnitPrice, type, isDefault, createdBy);
  // process.exit(0);

  const conversion = await client.query(
    `INSERT INTO conversions (
      product_id, 
      unit_id, 
      unit_qty, 
      unit_price, 
      type, 
      is_default, 
      created_by,
      is_active
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8
    ) RETURNING id`,
    [
      productId,
      toUnitId,
      toUnitQty,
      toUnitPrice,
      type,
      isDefault,
      createdBy,
      isActive
    ]
  );

  const conversionId = conversion.rows[0].id;

  // Create initial conversion log entry (similar to conversion service)
  await client.query(
    `INSERT INTO conversion_logs (
      conversion_id, 
      old_price, 
      new_price, 
      note, 
      valid_from, 
      created_by
    ) VALUES (
      $1, $2, $3, $4, NOW(), $5
    )`,
    [
      conversionId,
      null, // old_price is null for new conversions
      toUnitPrice, // new_price
      'Initial price from import', // note
      createdBy
    ]
  );

  return conversionId;
}

async function processMasterData(
  client: any, 
  dataSet: Set<string>, 
  type: 'category' | 'manufacturer' | 'unit', 
  mapping: { [key: string]: number }
): Promise<void> {
  let tableName;
  if (type === 'category') {
    tableName = 'categories';
  } else if (type === 'manufacturer') {
    tableName = 'manufacturers';
  } else {
    tableName = 'units';
  }
  
  for (const item of dataSet) {
    // First check if item exists
    const existingItem = await client.query(`SELECT id FROM ${tableName} WHERE name = $1`, [item]);
    
    if (existingItem.rows.length > 0) {
      // Item exists, use existing ID
      mapping[item] = existingItem.rows[0].id;
    } else {
      // Item doesn't exist, insert new one
      const result = await client.query(`INSERT INTO ${tableName} (name) VALUES ($1) RETURNING id`, [item]);
      mapping[item] = result.rows[0].id;
    }
  }
}

function __getUnitExtracted(unitName: string, row: number): { name: string, type: string } {
  let name = unitName;
  let type = 'sale';
  if([5].includes(row)){
    type = 'purchase';
  }
  if(![5,8,11].includes(row)){
    if(name.toLowerCase().includes('- beli')){
      type = 'purchase';
      name = name.toLowerCase().replace("- beli", "").trim();
    }
  }
  return { name: name, type: type };
}
