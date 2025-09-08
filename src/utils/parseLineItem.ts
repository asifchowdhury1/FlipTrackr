import { ParsedLineItem } from '../types';

export const parseLineItem = (input: string): ParsedLineItem | { error: string } => {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { error: 'Input cannot be empty' };
  }
  
  // Pattern 1: $amount - title or $amount-title
  const dollarPattern = /^\$?\s*([0-9+\-*/.\s]+)\s*-\s*(.+)$/;
  const dollarMatch = trimmed.match(dollarPattern);
  
  if (dollarMatch) {
    const amountStr = dollarMatch[1].trim();
    const title = dollarMatch[2].trim();
    
    if (!title) {
      return { error: 'Title cannot be empty' };
    }
    
    const amount = evaluateMath(amountStr);
    if (amount === null || amount <= 0) {
      return { error: 'Invalid amount' };
    }
    
    return { amount, title };
  }
  
  // Pattern 2: amount title (no $ or -)
  const numberPattern = /^([0-9+\-*/.\s]+)\s+(.+)$/;
  const numberMatch = trimmed.match(numberPattern);
  
  if (numberMatch) {
    const amountStr = numberMatch[1].trim();
    const title = numberMatch[2].trim();
    
    if (!title) {
      return { error: 'Title cannot be empty' };
    }
    
    const amount = evaluateMath(amountStr);
    if (amount === null || amount <= 0) {
      return { error: 'Invalid amount' };
    }
    
    return { amount, title };
  }
  
  // Pattern 3: Just a number at the start
  const simplePattern = /^([0-9+\-*/.\s]+)(.*)$/;
  const simpleMatch = trimmed.match(simplePattern);
  
  if (simpleMatch) {
    const amountStr = simpleMatch[1].trim();
    const title = simpleMatch[2].trim() || 'Expense';
    
    const amount = evaluateMath(amountStr);
    if (amount === null || amount <= 0) {
      return { error: 'Invalid amount' };
    }
    
    return { amount, title };
  }
  
  return { error: 'Could not parse input. Try format: $190 - description' };
};

const evaluateMath = (expression: string): number | null => {
  try {
    // Remove all spaces
    const cleaned = expression.replace(/\s/g, '');
    
    // Only allow numbers, +, -, *, /, and .
    if (!/^[0-9+\-*/.]+$/.test(cleaned)) {
      return null;
    }
    
    // Simple evaluation without eval() for security
    // Split by + and - first (lowest precedence)
    const tokens = cleaned.split(/([+\-])/);
    let result = 0;
    let currentOp = '+';
    
    for (const token of tokens) {
      if (token === '+' || token === '-') {
        currentOp = token;
      } else {
        const value = evaluateMultiplyDivide(token);
        if (value === null) return null;
        
        if (currentOp === '+') {
          result += value;
        } else {
          result -= value;
        }
      }
    }
    
    return Math.round(result * 100) / 100; // Round to 2 decimal places
  } catch {
    return null;
  }
};

const evaluateMultiplyDivide = (expression: string): number | null => {
  try {
    const tokens = expression.split(/([*/])/);
    let result = parseFloat(tokens[0]);
    
    if (isNaN(result)) return null;
    
    for (let i = 1; i < tokens.length; i += 2) {
      const op = tokens[i];
      const value = parseFloat(tokens[i + 1]);
      
      if (isNaN(value)) return null;
      
      if (op === '*') {
        result *= value;
      } else if (op === '/') {
        if (value === 0) return null; // Division by zero
        result /= value;
      }
    }
    
    return result;
  } catch {
    return null;
  }
};