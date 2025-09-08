export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getDaysToSell = (createdAt: string, soldDate?: string): number | null => {
  if (!soldDate) return null;
  
  const created = new Date(createdAt);
  const sold = new Date(soldDate);
  const diffTime = sold.getTime() - created.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export const getCurrentISOString = (): string => {
  return new Date().toISOString();
};