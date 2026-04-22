import crypto from 'crypto';

/**
 * Utilidades de cifrado para GestiónPro
 * Implementación segura mediante AES-256-GCM
 */

// Clave maestra de cifrado (32 bytes)
// IMPORTANTE: En producción, esto debe venir de process.env.NEXT_PUBLIC_CRYPTO_KEY
const SECRET_KEY = Buffer.from('8f92b4c1029c4d5e8f1a2b3c4d5e6f7a', 'hex'); // Ejemplo de 32 bytes
const IV_LENGTH = 12; // GCM usa 12 bytes para IV
const AUTH_TAG_LENGTH = 16;

/**
 * Cifra un texto plano
 */
export function encrypt(text: string): string {
  if (!text) return '';
  let iv: Buffer;
  if (typeof window !== 'undefined' && window.crypto) {
    const rawIv = new Uint8Array(IV_LENGTH);
    window.crypto.getRandomValues(rawIv);
    iv = Buffer.from(rawIv);
  } else {
    iv = crypto.randomBytes(IV_LENGTH);
  }
  const cipher = crypto.createCipheriv('aes-256-gcm', SECRET_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Retornamos IV:TAG:DATOS
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Descifra un texto cifrado
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';
  try {
    const [ivHex, authTagHex, encryptedText] = encryptedData.split(':');
    if (!ivHex || !authTagHex || !encryptedText) return '';

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', SECRET_KEY, iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Error al descifrar:', err);
    return '';
  }
}
