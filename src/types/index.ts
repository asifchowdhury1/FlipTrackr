export interface Flip {
  id: number;
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  miles?: number;
  buy_price: number;
  sell_price?: number;
  sold_date?: string;
  created_at: string;
  updated_at: string;
}

export interface LineItem {
  id: number;
  flip_id: number;
  title: string;
  amount: number;
  category?: 'parts' | 'labor' | 'fees' | 'misc';
  date?: string;
  created_at: string;
  updated_at: string;
}

export interface FlipTotals {
  totalCost: number;
  profit: number;
  roi: number;
}


export interface ParsedLineItem {
  amount: number;
  title: string;
}

