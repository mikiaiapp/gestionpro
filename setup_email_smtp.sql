-- ==========================================
-- MIGRACIÓN v1.7: Campos Email SMTP
-- ==========================================
-- Ejecuta en Supabase SQL Editor

ALTER TABLE perfil_negocio
  ADD COLUMN IF NOT EXISTS smtp_email TEXT,
  ADD COLUMN IF NOT EXISTS smtp_app_password TEXT,
  ADD COLUMN IF NOT EXISTS smtp_host TEXT DEFAULT 'smtp.gmail.com',
  ADD COLUMN IF NOT EXISTS smtp_port TEXT DEFAULT '587';

-- ==========================================
-- VERIFICACIÓN: Si no hay errores, completado.
-- ==========================================
