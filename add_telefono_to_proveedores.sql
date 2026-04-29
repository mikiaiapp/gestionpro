-- Añadir campo teléfono a la tabla de proveedores
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS telefono text;
