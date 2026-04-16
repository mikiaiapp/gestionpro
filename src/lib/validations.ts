/**
 * Validaciones Legales para España (NIF, CIF, NIE, IBAN)
 */

export const validateNIF = (nif: string): boolean => {
  if (!nif || nif.length < 9) return false;
  const cleanNif = nif.toUpperCase().replace(/\s/g, '');
  
  // DNI/NIE
  if (/^[0-9XYZ][0-9]{7}[A-Z]$/.test(cleanNif)) {
    let numberPart = cleanNif.substring(0, 8);
    numberPart = numberPart.replace('X', '0').replace('Y', '1').replace('Z', '2');
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const expectedLetter = letters[parseInt(numberPart) % 23];
    return cleanNif.endsWith(expectedLetter);
  }
  
  // CIF
  if (/^[ABCDEFGHJKLMNPQRSTUVW][0-9]{7}[0-9A-J]$/.test(cleanNif)) {
    return true; // Validación simplificada de estructura de CIF
  }
  
  return false;
};

export const validateIBAN = (iban: string): boolean => {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  if (!/^ES[0-9]{22}$/.test(cleanIban)) return false;
  
  // Algoritmo MOD-97-10
  const rearranged = cleanIban.substring(4) + '1428' + cleanIban.substring(2, 4);
  let remainder = 0;
  for (let i = 0; i < rearranged.length; i += 7) {
    const chunk = remainder.toString() + rearranged.substring(i, i + 7);
    remainder = parseInt(chunk) % 97;
  }
  return remainder === 1;
};

export const formatIBAN = (iban: string): string => {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  const groups = clean.match(/.{1,4}/g);
  return groups ? groups.join(' ') : clean;
};
