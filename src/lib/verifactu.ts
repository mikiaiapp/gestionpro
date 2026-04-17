import { createHash } from 'crypto';

/**
 * Lógica de Verifactu para GestiónPro
 * Cumplimiento con el RD 1007/2023
 */

export interface VerifactuRecord {
  nifExpedidor: string;
  numFactura: string;
  fechaExpedicion: string;
  tipoFactura: string;
  importeTotal: number;
  hashAnterior?: string;
}

/**
 * Calcula la huella (hash) encadenado siguiendo la normativa AEAT
 * Huella = SHA256(RegistroActual + HuellaAnterior)
 */
export function calculateVerifactuHash(record: VerifactuRecord): string {
  // Formato de cadena para el hash según especificaciones técnicas (simplificado para MVP)
  // IDExpedidor + NumFactura + Fecha + Importe + HashAnterior
  const data = `${record.nifExpedidor}${record.numFactura}${record.fechaExpedicion}${record.importeTotal.toFixed(2)}${record.hashAnterior || ''}`;
  
  return createHash('sha256').update(data).digest('hex').toUpperCase();
}

/**
 * Genera el XML de Registro de Facturación para Verifactu
 * Nota: Esto es una estructura base que deberá ajustarse al XSD v0.4+
 */
export function generateVerifactuXML(record: VerifactuRecord, hash: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<entry:RegistroFacturacion xmlns:entry="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd">
  <entry:Cabecera>
    <entry:IDVersionSchema>1.0</entry:IDVersionSchema>
  </entry:Cabecera>
  <entry:RegistroFactura>
    <entry:IDFactura>
      <entry:IDExpedidor>${record.nifExpedidor}</entry:IDExpedidor>
      <entry:NumSerieFactura>${record.numFactura}</entry:NumSerieFactura>
      <entry:FechaExpedicionFactura>${record.fechaExpedicion}</entry:FechaExpedicionFactura>
    </entry:IDFactura>
    <entry:DatosFactura>
      <entry:TipoFactura>${record.tipoFactura}</entry:TipoFactura>
      <entry:ImporteTotal>${record.importeTotal.toFixed(2)}</entry:ImporteTotal>
    </entry:DatosFactura>
    <entry:Encadenamiento>
      <entry:HuellaAnterior>${record.hashAnterior || ''}</entry:HuellaAnterior>
    </entry:Encadenamiento>
    <entry:Resguardo>
      <entry:Huella>${hash}</entry:Huella>
    </entry:Resguardo>
  </entry:RegistroFactura>
</entry:RegistroFacturacion>`;
}
