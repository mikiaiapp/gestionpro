-- ==========================================
-- MIGRACIÓN: COLUMNAS FALTANTES EN PRESUPUESTOS
-- ==========================================
-- Instrucciones: Copia este código y ejecútalo en el SQL Editor
-- de tu proyecto en Supabase (https://app.supabase.com/)
-- Dashboard → SQL Editor → New Query → Pegar → Run

-- 1. Añadir coste_unitario a las líneas de presupuesto
--    (Esta columna es la causa del fallo al guardar partidas)
ALTER TABLE proyecto_lineas
ADD COLUMN IF NOT EXISTS coste_unitario NUMERIC(12,2) DEFAULT 0;

-- 2. Asegurar condiciones particulares en proyectos
ALTER TABLE proyectos
ADD COLUMN IF NOT EXISTS condiciones_particulares TEXT;

-- 3. Asegurar campo archivo_url en proyectos (para gestión documental)
ALTER TABLE proyectos
ADD COLUMN IF NOT EXISTS archivo_url TEXT;

-- 4. Asegurar campo telefono en clientes
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS telefono TEXT;

-- ==========================================
-- VERIFICACIÓN: Si ves "Success" en todas las filas, ya puedes
-- guardar presupuestos con partidas de coste y venta correctamente.
-- ==========================================
