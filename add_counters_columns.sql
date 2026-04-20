-- SCRIPT PARA AÑADIR CONTADORES Y SERIES A PERFIL_NEGOCIO
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE perfil_negocio 
ADD COLUMN IF NOT EXISTS contador_ventas INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS contador_costes INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS contador_proyectos INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS serie_ventas TEXT DEFAULT 'A',
ADD COLUMN IF NOT EXISTS serie_costes TEXT DEFAULT 'A',
ADD COLUMN IF NOT EXISTS serie_proyectos TEXT DEFAULT 'P';

-- Nota: Si ya existen registros, podrías querer inicializarlos con el máximo actual
-- Pero el editor en Ajustes permitirá al usuario ajustarlos manualmente.
