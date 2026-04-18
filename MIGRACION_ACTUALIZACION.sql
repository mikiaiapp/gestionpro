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

-- Soporte documental para Facturas y Gastos
ALTER TABLE public.costes ADD COLUMN IF NOT EXISTS archivo_url text;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS archivo_url text;

-- Perfiles y 2FA
CREATE TABLE IF NOT EXISTS public.perfiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nombre text,
    email text,
    rol text DEFAULT 'Usuario',
    two_factor_enabled boolean DEFAULT false,
    two_factor_pin text,
    created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre)
  VALUES (new.id, new.email, split_part(new.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Forzar creación de perfiles para usuarios existentes
INSERT INTO public.perfiles (id, email, nombre)
SELECT id, email, split_part(email, '@', 1) FROM auth.users
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RLS_Perfiles_Self" ON public.perfiles;
CREATE POLICY "RLS_Perfiles_Self" ON public.perfiles FOR ALL USING (auth.uid() = id);
DROP POLICY IF EXISTS "RLS_Perfiles_View_All" ON public.perfiles;
CREATE POLICY "RLS_Perfiles_View_All" ON public.perfiles FOR SELECT USING (true);

-- Gestión Documental Adicional
-- 9.6 Documentación Adicional de Proyectos
CREATE TABLE IF NOT EXISTS public.proyecto_documentos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    archivo_url text NOT NULL,
    tipo text, -- 'foto', 'plano', 'otros'
    size numeric,
    user_id uuid REFERENCES auth.users(id)
);

-- 9.7 Sistema de Backups Automáticos
CREATE TABLE IF NOT EXISTS public.backups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    nombre text,
    archivo_url text,
    size numeric,
    user_id uuid REFERENCES auth.users(id)
);

ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RLS_Backups" ON public.backups;
CREATE POLICY "RLS_Backups" ON public.backups FOR ALL USING (auth.uid() = user_id);

-- Asegurar Cascada en eliminaciones de lineas
-- (Si falla es que ya existe la FK)
-- ALTER TABLE public.proyecto_lineas DROP CONSTRAINT IF EXISTS proyecto_lineas_proyecto_id_fkey;
-- ALTER TABLE public.proyecto_lineas ADD CONSTRAINT proyecto_lineas_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id) ON DELETE CASCADE;
