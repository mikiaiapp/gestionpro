-- ==========================================
-- SCRIPT DE MIGRACIÓN INTEGRAL: GESTIÓN DE CONTADORES
-- ==========================================
-- Instrucciones: Copia este código y ejecútalo en el SQL Editor 
-- de tu proyecto en Supabase (https://app.supabase.com/)

-- 1. Añadir Contadores y Series
ALTER TABLE perfil_negocio 
ADD COLUMN IF NOT EXISTS contador_ventas INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS contador_costes INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS contador_proyectos INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS serie_ventas TEXT DEFAULT 'A',
ADD COLUMN IF NOT EXISTS serie_costes TEXT DEFAULT 'A',
ADD COLUMN IF NOT EXISTS serie_proyectos TEXT DEFAULT 'P';

-- 2. Añadir Prefijos Alfanuméricos
ALTER TABLE perfil_negocio 
ADD COLUMN IF NOT EXISTS prefijo_ventas TEXT,
ADD COLUMN IF NOT EXISTS prefijo_costes TEXT,
ADD COLUMN IF NOT EXISTS prefijo_proyectos TEXT;

-- 3. Campos de Verifactu (Soporte Adicional)
ALTER TABLE perfil_negocio 
ADD COLUMN IF NOT EXISTS verifactu_certificado TEXT,
ADD COLUMN IF NOT EXISTS verifactu_pass TEXT,
ADD COLUMN IF NOT EXISTS verifactu_env TEXT DEFAULT 'pruebas';

-- 4. Otros campos de identidad si faltasen
ALTER TABLE perfil_negocio 
ADD COLUMN IF NOT EXISTS texto_aceptacion TEXT,
ADD COLUMN IF NOT EXISTS imagen_corporativa_url TEXT;

-- ==========================================
-- VERIFICACIÓN COMPLETADA
-- Si ves un mensaje de éxito, ya puedes usar los contadores en Ajustes.
-- ==========================================
