export const formatCurrency = (amount: number): string => {
  // Forzamos el formato con puntos y comas manualmente por seguridad extrema
  const parts = (amount || 0).toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${parts.join(',')} €`;
};
