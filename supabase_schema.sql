-- ==========================================
-- GestiónPro: Esquema Completo de Base de Datos
-- Versión: 3.1 (Actualizado con Presupuestos y Costes por Línea)
-- ==========================================

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Eliminación de tablas previas (Opcional, cuidado en producción)
-- DROP TABLE IF EXISTS cobros, pagos, venta_lineas, proyecto_lineas, ventas, costes, proyectos, proveedores, clientes, perfil_negocio, tipos_iva, tipos_irpf CASCADE;

-- 3. Tabla de Perfil de Negocio / Configuración
CREATE TABLE IF NOT EXISTS public.perfil_negocio (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) UNIQUE,
    nombre text,
    nif text,
    direccion text,
    cp text,
    poblacion text,
    provincia text,
    email text,
    cuenta_bancaria text,
    forma_pago_default text,
    gemini_key text,
    logo_url text,
    tiene_retencion boolean DEFAULT false,
    irpf_default numeric DEFAULT 0,
    condiciones_legales text,
    lopd_text text,
    verifactu_certificado text,
    verifactu_pass text,
    verifactu_env text DEFAULT 'pruebas'
);

-- 4. Entidades maestras
CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    nombre text NOT NULL,
    nif text,
    email text,
    direccion text,
    codigo_postal text,
    poblacion text,
    provincia text,
    user_id uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.proveedores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    nombre text NOT NULL,
    nif text,
    email text,
    direccion text,
    codigo_postal text,
    poblacion text,
    provincia text,
    user_id uuid REFERENCES auth.users(id)
);

-- 5. Módulo de Presupuestos (Anteriormente Proyectos)
CREATE TABLE IF NOT EXISTS public.proyectos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
    nombre text NOT NULL,
    serie text DEFAULT 'P',
    numero text,
    fecha date DEFAULT now(),
    venta_prevista numeric DEFAULT 0,
    coste_previsto numeric DEFAULT 0,
    base_imponible numeric DEFAULT 0,
    iva_pct numeric DEFAULT 21,
    iva_importe numeric DEFAULT 0,
    retencion_pct numeric DEFAULT 0,
    retencion_importe numeric DEFAULT 0,
    total numeric DEFAULT 0,
    estado text DEFAULT 'Abierto',
    condiciones_particulares text,
    user_id uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.proyecto_lineas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE CASCADE,
    unidades numeric DEFAULT 1,
    descripcion text,
    precio_unitario numeric DEFAULT 0,
    coste_unitario numeric DEFAULT 0
);

-- 6. Módulo de Facturación (Ventas)
CREATE TABLE IF NOT EXISTS public.ventas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
    cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
    serie text NOT NULL,
    num_factura integer NOT NULL,
    fecha date NOT NULL,
    base_imponible numeric DEFAULT 0,
    iva_pct numeric DEFAULT 21,
    iva_importe numeric DEFAULT 0,
    retencion_pct numeric DEFAULT 0,
    retencion_importe numeric DEFAULT 0,
    total numeric DEFAULT 0,
    user_id uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.venta_lineas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    venta_id uuid REFERENCES public.ventas(id) ON DELETE CASCADE,
    unidades numeric DEFAULT 1,
    descripcion text,
    precio_unitario numeric DEFAULT 0
);

-- 7. Módulo de Gastos (Costes)
CREATE TABLE IF NOT EXISTS public.costes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
    proveedor_id uuid REFERENCES public.proveedores(id) ON DELETE SET NULL,
    registro_interno text,
    num_factura_proveedor text,
    fecha date NOT NULL,
    base_imponible numeric DEFAULT 0,
    iva_pct numeric DEFAULT 21,
    iva_importe numeric DEFAULT 0,
    retencion_pct numeric DEFAULT 0,
    retencion_importe numeric DEFAULT 0,
    total numeric DEFAULT 0,
    archivo_url text,
    user_id uuid REFERENCES auth.users(id)
);

-- 8. Tesorería (Cobros y Pagos)
CREATE TABLE IF NOT EXISTS public.cobros (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    venta_id uuid REFERENCES public.ventas(id) ON DELETE CASCADE,
    fecha date NOT NULL,
    importe numeric NOT NULL,
    forma_pago text,
    user_id uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.pagos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    coste_id uuid REFERENCES public.costes(id) ON DELETE CASCADE,
    fecha date NOT NULL,
    importe numeric NOT NULL,
    forma_pago text,
    user_id uuid REFERENCES auth.users(id)
);

-- 9. Tablas Auxiliares
CREATE TABLE IF NOT EXISTS public.tipos_iva (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text,
    valor numeric,
    user_id uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.tipos_irpf (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text,
    valor numeric,
    user_id uuid REFERENCES auth.users(id)
);

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
CREATE POLICY "RLS_Backups" ON public.backups FOR ALL USING (auth.uid() = user_id);

-- 9.5 Perfiles de Usuario y Seguridad 2FA
CREATE TABLE IF NOT EXISTS public.perfiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nombre text,
    email text,
    rol text DEFAULT 'Usuario',
    two_factor_enabled boolean DEFAULT false,
    two_factor_pin text, -- Guardaremos el PIN (idealmente hasheado, pero por ahora texto para el MVP)
    created_at timestamptz DEFAULT now()
);

-- Trigger para crear perfil automáticamente al registrarse en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre)
  VALUES (new.id, new.email, split_part(new.email, '@', 1));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Borrar trigger si existe y crearlo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. Seguridad RLS (Row Level Security)
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.costes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_iva ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_irpf ENABLE ROW LEVEL SECURITY;

-- Políticas por defecto (Propietario ve sus datos)
CREATE POLICY "RLS_Clientes" ON public.clientes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Proyectos" ON public.proyectos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Ventas" ON public.ventas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Proveedores" ON public.proveedores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Costes" ON public.costes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Cobros" ON public.cobros FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Pagos" ON public.pagos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Perfil" ON public.perfil_negocio FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_IVA" ON public.tipos_iva FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_IRPF" ON public.tipos_irpf FOR ALL USING (auth.uid() = user_id);
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RLS_Perfiles_Self" ON public.perfiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "RLS_Perfiles_View_All" ON public.perfiles FOR SELECT USING (true);

-- Políticas para tablas hijas (acceso basado en el padre)
CREATE POLICY "RLS_Proyecto_Lineas" ON public.proyecto_lineas FOR ALL USING (
    EXISTS (SELECT 1 FROM proyectos WHERE proyectos.id = proyecto_lineas.proyecto_id AND proyectos.user_id = auth.uid())
);
CREATE POLICY "RLS_Venta_Lineas" ON public.venta_lineas FOR ALL USING (
    EXISTS (SELECT 1 FROM ventas WHERE ventas.id = venta_lineas.venta_id AND ventas.user_id = auth.uid())
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_proyectos_user ON public.proyectos(user_id);
CREATE INDEX IF NOT EXISTS idx_ventas_user ON public.ventas(user_id);
CREATE INDEX IF NOT EXISTS idx_costes_user ON public.costes(user_id);
