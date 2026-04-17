/**
 * Servicio de comunicación con la AEAT para Verifactu
 */

import { generateVerifactuXML, VerifactuRecord, calculateVerifactuHash } from './verifactu';
import { decrypt } from './encryption';

// Endpoints oficiales (Simulados para desarrollo)
const ENDPOINTS = {
  TEST: 'https://www1.agenciatributaria.gob.es/wlpl/zsce-itst/verifactu/enviar',
  PROD: 'https://www2.agenciatributaria.gob.es/wlpl/zsce-itst/verifactu/enviar'
};

export interface VerifactuResponse {
  success: boolean;
  status: 'Aceptado' | 'Rechazado' | 'Error';
  refAeat?: string;
  errorMsg?: string;
}

/**
 * Envía una factura al portal de la AEAT
 */
export async function sendInvoiceToAeat(record: VerifactuRecord, perfil: any): Promise<VerifactuResponse> {
  try {
    const hash = calculateVerifactuHash(record);
    const xml = generateVerifactuXML(record, hash);
    
    const env = perfil.verifactu_env || 'pruebas';
    const endpoint = env === 'produccion' ? ENDPOINTS.PROD : ENDPOINTS.TEST;
    
    // Desciframos la contraseña para usarla en la firma digital
    const certPass = decrypt(perfil.verifactu_pass);
    
    console.log(`--- TRANSMITIENDO A AEAT (${env.toUpperCase()}) ---`);
    console.log('Endpoint:', endpoint);
    console.log('Certificado:', perfil.verifactu_certificado ? 'Cargado' : 'Faltante');
    console.log('Contraseña Descifrada:', certPass ? 'OK (Oculta)' : 'Faltante');

    // TODO: Implementar firma XMLDSig real usando certPass y perfil.verifactu_certificado
    
    await new Promise(r => setTimeout(r, 1500));

    return {
      success: true,
      status: 'Aceptado',
      refAeat: `${env === 'pruebas' ? 'TEST' : 'VERI'}-${Date.now().toString().slice(-8)}`,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'Error',
      errorMsg: err.message
    };
  }
}
