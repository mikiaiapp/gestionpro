-- SCRIPT PARA AÑADIR PREFIJO A LAS FACTURAS EMITIDAS
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE perfil_negocio 
ADD COLUMN IF NOT EXISTS prefijo_ventas TEXT;

-- Si deseas que las facturas recibidas y presupuestos también lo tengan (opcional pero recomendado por consistencia):
ALTER TABLE perfil_negocio 
ADD COLUMN IF NOT EXISTS prefijo_costes TEXT,
ADD COLUMN IF NOT EXISTS prefijo_proyectos TEXT;
