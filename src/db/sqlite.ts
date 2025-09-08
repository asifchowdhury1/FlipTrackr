import * as SQLite from 'expo-sqlite';
import { MIGRATIONS, SCHEMA_UPDATES } from './schema';
import { Flip, LineItem, FlipTotals } from '../types';

const DATABASE_NAME = 'autotrackr.db';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    
    // Run migrations
    for (const migration of MIGRATIONS) {
      await db.execAsync(migration);
    }
    
    // Run schema updates (safely with try-catch for existing columns)
    for (const update of SCHEMA_UPDATES) {
      try {
        await db.execAsync(update);
      } catch (error) {
        // Column might already exist, which is fine
        console.log('Schema update skipped (likely already exists):', error);
      }
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

// Flip CRUD operations
export const createFlip = async (flip: Omit<Flip, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
  const database = getDatabase();
  const now = new Date().toISOString();
  
  const result = await database.runAsync(
    `INSERT INTO flips (year, make, model, vin, miles, buy_price, sell_price, sold_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [flip.year || null, flip.make || null, flip.model || null, flip.vin || null, 
     flip.miles || null, flip.buy_price, flip.sell_price || null, flip.sold_date || null, now, now]
  );
  
  return result.lastInsertRowId;
};

export const getFlips = async (): Promise<Flip[]> => {
  const database = getDatabase();
  const result = await database.getAllAsync('SELECT * FROM flips ORDER BY created_at DESC');
  return result as Flip[];
};

export const getFlipById = async (id: number): Promise<Flip | null> => {
  const database = getDatabase();
  const result = await database.getFirstAsync('SELECT * FROM flips WHERE id = ?', [id]);
  return result as Flip | null;
};

export const updateFlip = async (id: number, flip: Partial<Omit<Flip, 'id' | 'created_at'>>): Promise<void> => {
  const database = getDatabase();
  const now = new Date().toISOString();
  
  const fields = [];
  const values = [];
  
  Object.entries(flip).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });
  
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  await database.runAsync(
    `UPDATE flips SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
};

export const deleteFlip = async (id: number): Promise<void> => {
  const database = getDatabase();
  await database.runAsync('DELETE FROM flips WHERE id = ?', [id]);
};

// LineItem CRUD operations
export const addLineItem = async (lineItem: Omit<LineItem, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
  const database = getDatabase();
  const now = new Date().toISOString();
  
  const result = await database.runAsync(
    `INSERT INTO line_items (flip_id, title, amount, category, date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [lineItem.flip_id, lineItem.title, lineItem.amount, lineItem.category || null, 
     lineItem.date || null, now, now]
  );
  
  return result.lastInsertRowId;
};

export const getLineItemsByFlip = async (flipId: number): Promise<LineItem[]> => {
  const database = getDatabase();
  const result = await database.getAllAsync(
    'SELECT * FROM line_items WHERE flip_id = ? ORDER BY created_at ASC',
    [flipId]
  );
  return result as LineItem[];
};

export const updateLineItem = async (id: number, lineItem: Partial<Omit<LineItem, 'id' | 'flip_id' | 'created_at'>>): Promise<void> => {
  const database = getDatabase();
  const now = new Date().toISOString();
  
  const fields = [];
  const values = [];
  
  Object.entries(lineItem).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'flip_id' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });
  
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  await database.runAsync(
    `UPDATE line_items SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
};

export const deleteLineItem = async (id: number): Promise<void> => {
  const database = getDatabase();
  await database.runAsync('DELETE FROM line_items WHERE id = ?', [id]);
};

// Helper functions
export const computeTotals = async (flipId: number): Promise<FlipTotals> => {
  const database = getDatabase();
  const flip = await getFlipById(flipId);
  const lineItems = await getLineItemsByFlip(flipId);
  
  if (!flip) {
    throw new Error('Flip not found');
  }
  
  const totalCost = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const sellPrice = flip.sell_price || 0;
  const profit = sellPrice - (flip.buy_price + totalCost);
  const investedAmount = flip.buy_price + totalCost;
  const roi = investedAmount > 0 ? profit / investedAmount : 0;
  
  return {
    totalCost,
    profit,
    roi,
  };
};