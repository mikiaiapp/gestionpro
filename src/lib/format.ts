/**
 * Utility for formatting currency and numbers in Spanish locale (es-ES)
 * 1.000,00 €
 */

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num || 0);
};

/**
 * Strips formatting to get a raw number (e.g. for database)
 */
export const parseRawNumber = (str: string): number => {
  if (!str) return 0;
  // Replace thousands dots, then change comma to dot
  const clean = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
};
