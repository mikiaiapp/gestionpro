export type Client = {
  id: string;
  nombre: string;
  nif: string;
  direccion: string;
  cp: string;
  poblacion: string;
  provincia: string;
  email: string;
  telefono: string;
  created_at: string;
};

export type Project = {
  id: string;
  nombre: string;
  cliente_id: string;
  presupuesto_venta: number;
  presupuesto_coste: number;
  estado: 'abierto' | 'cerrado';
  created_at: string;
};

export type Invoice = {
  id: string;
  serie: 'A' | 'B';
  numero: string;
  fecha: string;
  cliente_id: string;
  proyecto_id: string | null;
  base_imponible: number;
  iva_pct: number;
  total: number;
  pagado: boolean;
  pdf_drive_id?: string;
  created_at: string;
};

export type Cost = {
  id: string;
  serie: 'A' | 'B';
  numero: string; // Internal tracking
  proveedor: string;
  nif_proveedor: string;
  num_factura_proveedor: string;
  fecha: string;
  proyecto_id: string | null;
  base_imponible: number;
  iva_pct: number;
  irpf_pct: number;
  total: number;
  pagado: boolean;
  created_at: string;
};
