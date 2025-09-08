import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Flip, LineItem, FlipTotals } from '../types';
import * as db from '../db/sqlite';

interface FlipsContextType {
  flips: Flip[];
  loading: boolean;
  
  // Flip operations
  createFlip: (flip: Omit<Flip, 'id' | 'created_at' | 'updated_at'>) => Promise<number>;
  getFlipById: (id: number) => Promise<Flip | null>;
  updateFlip: (id: number, flip: Partial<Omit<Flip, 'id' | 'created_at'>>) => Promise<void>;
  deleteFlip: (id: number) => Promise<void>;
  duplicateFlip: (id: number) => Promise<number>;
  
  // Line item operations
  addLineItem: (lineItem: Omit<LineItem, 'id' | 'created_at' | 'updated_at'>) => Promise<number>;
  getLineItemsByFlip: (flipId: number) => Promise<LineItem[]>;
  updateLineItem: (id: number, lineItem: Partial<Omit<LineItem, 'id' | 'flip_id' | 'created_at'>>) => Promise<void>;
  deleteLineItem: (id: number) => Promise<void>;
  
  // Calculations
  computeTotals: (flipId: number) => Promise<FlipTotals>;
  
  // Data refresh
  refreshFlips: () => Promise<void>;
  
  // Seed data
  loadSampleData: () => Promise<void>;
}

const FlipsContext = createContext<FlipsContextType | undefined>(undefined);

export const useFlips = () => {
  const context = useContext(FlipsContext);
  if (context === undefined) {
    throw new Error('useFlips must be used within a FlipsProvider');
  }
  return context;
};

interface FlipsProviderProps {
  children: ReactNode;
}

export const FlipsProvider: React.FC<FlipsProviderProps> = ({ children }) => {
  const [flips, setFlips] = useState<Flip[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshFlips = async () => {
    try {
      const allFlips = await db.getFlips();
      setFlips(allFlips);
    } catch (error) {
      console.error('Error refreshing flips:', error);
    }
  };

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await db.initDatabase();
        await refreshFlips();
      } catch (error) {
        console.error('Error initializing database:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeDatabase();
  }, []);

  const createFlip = async (flip: Omit<Flip, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
    const flipId = await db.createFlip(flip);
    await refreshFlips();
    return flipId;
  };

  const getFlipById = async (id: number): Promise<Flip | null> => {
    return await db.getFlipById(id);
  };

  const updateFlip = async (id: number, flip: Partial<Omit<Flip, 'id' | 'created_at'>>): Promise<void> => {
    await db.updateFlip(id, flip);
    await refreshFlips();
  };

  const deleteFlip = async (id: number): Promise<void> => {
    await db.deleteFlip(id);
    await refreshFlips();
  };

  const duplicateFlip = async (id: number): Promise<number> => {
    const originalFlip = await db.getFlipById(id);
    if (!originalFlip) throw new Error('Flip not found');

    const lineItems = await db.getLineItemsByFlip(id);
    
    // Create new flip without sold data
    const newFlipId = await db.createFlip({
      year: originalFlip.year,
      make: originalFlip.make,
      model: originalFlip.model,
      vin: originalFlip.vin,
      miles: originalFlip.miles,
      buy_price: originalFlip.buy_price,
    });

    // Copy all line items
    for (const item of lineItems) {
      await db.addLineItem({
        flip_id: newFlipId,
        title: item.title,
        amount: item.amount,
        category: item.category,
        date: item.date,
      });
    }

    await refreshFlips();
    return newFlipId;
  };

  const addLineItem = async (lineItem: Omit<LineItem, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
    return await db.addLineItem(lineItem);
  };

  const getLineItemsByFlip = async (flipId: number): Promise<LineItem[]> => {
    return await db.getLineItemsByFlip(flipId);
  };

  const updateLineItem = async (id: number, lineItem: Partial<Omit<LineItem, 'id' | 'flip_id' | 'created_at'>>): Promise<void> => {
    await db.updateLineItem(id, lineItem);
  };

  const deleteLineItem = async (id: number): Promise<void> => {
    await db.deleteLineItem(id);
  };

  const computeTotals = async (flipId: number): Promise<FlipTotals> => {
    return await db.computeTotals(flipId);
  };

  const loadSampleData = async (): Promise<void> => {
    // Create the sample flip: 2011 BMW 328i
    const flipId = await createFlip({
      year: 2011,
      make: 'BMW',
      model: '328i',
      buy_price: 3500,
      miles: 155000,
      sell_price: 6200,
      sold_date: new Date().toISOString(),
    });

    // Add sample line items
    const sampleItems = [
      { title: 'water pump', amount: 320, category: 'parts' as const },
      { title: 'thermostat', amount: 95, category: 'parts' as const },
      { title: 'OFHG', amount: 45, category: 'parts' as const },
      { title: 'cooling system labor', amount: 350, category: 'labor' as const },
      { title: 'title/tax', amount: 120, category: 'fees' as const },
      { title: 'listing fees', amount: 100, category: 'fees' as const },
    ];

    for (const item of sampleItems) {
      await addLineItem({
        flip_id: flipId,
        title: item.title,
        amount: item.amount,
        category: item.category,
      });
    }

    await refreshFlips();
  };

  const contextValue: FlipsContextType = {
    flips,
    loading,
    createFlip,
    getFlipById,
    updateFlip,
    deleteFlip,
    duplicateFlip,
    addLineItem,
    getLineItemsByFlip,
    updateLineItem,
    deleteLineItem,
    computeTotals,
    refreshFlips,
    loadSampleData,
  };

  return (
    <FlipsContext.Provider value={contextValue}>
      {children}
    </FlipsContext.Provider>
  );
};