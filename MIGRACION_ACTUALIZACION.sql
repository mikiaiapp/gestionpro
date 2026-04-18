-- ==========================================
-- SCRIPT DE MIGRACIÓN / ACTUALIZACIÓN
-- Ejecuta esto si ya tienes la base de datos instalada
-- pero te faltan las últimas columnas añadidas.
-- ==========================================

-- Columnas para Presupuestos (Proyectos)
ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS serie text DEFAULT 'P';
ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS condiciones_particulares text;

-- Columna para Coste Unitario por Partida
ALTER TABLE public.proyecto_lineas ADD COLUMN IF NOT EXISTS coste_unitario numeric DEFAULT 0;

-- Asegurar Cascada en eliminaciones de lineas
-- (Si falla es que ya existe la FK)
-- ALTER TABLE public.proyecto_lineas DROP CONSTRAINT IF EXISTS proyecto_lineas_proyecto_id_fkey;
-- ALTER TABLE public.proyecto_lineas ADD CONSTRAINT proyecto_lineas_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id) ON DELETE CASCADE;
