-- ==========================================
-- GESTIÓNPRO v1.5 - ESQUEMA DE PRODUCCIÓN
-- ==========================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLAS MAESTRAS
CREATE TABLE IF NOT EXISTS public.perfiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nombre text,
    email text,
    rol text DEFAULT 'Usuario',
    created_at timestamptz DEFAULT now()
);

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
    gemini_key text, -- Clave API para extracción IA
    logo_url text,
    tiene_retencion boolean DEFAULT false,
    irpf_default numeric DEFAULT 0,
    condiciones_legales text,
    lopd_text text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    nombre text NOT NULL,
    nif text,
    email text,
    direccion text,
    codigo_postal text,
    poblacion text,
    provincia text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proveedores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    nombre text NOT NULL,
    nif text,
    email text,
    direccion text,
    codigo_postal text,
    poblacion text,
    provincia text,
    created_at timestamptz DEFAULT now()
);

-- 3. PROYECTOS Y PRESUPUESTOS
CREATE TABLE IF NOT EXISTS public.proyectos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
    nombre text NOT NULL,
    serie text DEFAULT 'P',
    numero text,
    fecha date DEFAULT now(),
    base_imponible numeric DEFAULT 0,
    iva_pct numeric DEFAULT 21,
    total numeric DEFAULT 0,
    estado text DEFAULT 'Abierto', -- 'Abierto', 'Aceptado', 'Cerrado'
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proyecto_lineas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE CASCADE,
    unidades numeric DEFAULT 1,
    descripcion text,
    precio_unitario numeric DEFAULT 0,
    coste_unitario numeric DEFAULT 0
);

-- 4. VENTAS (FACTURACIÓN EMITIDA)
CREATE TABLE IF NOT EXISTS public.ventas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
    cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
    serie text NOT NULL DEFAULT 'F',
    num_factura integer NOT NULL,
    fecha date NOT NULL,
    base_imponible numeric DEFAULT 0,
    iva_pct numeric DEFAULT 21,
    retencion_pct numeric DEFAULT 0,
    total numeric DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venta_lineas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    venta_id uuid REFERENCES public.ventas(id) ON DELETE CASCADE,
    unidades numeric DEFAULT 1,
    descripcion text,
    precio_unitario numeric DEFAULT 0
);

-- 5. COSTES (FACTURACIÓN RECIBIDA / GASTOS)
CREATE TABLE IF NOT EXISTS public.costes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
    proveedor_id uuid REFERENCES public.proveedores(id) ON DELETE SET NULL,
    registro_interno text, -- Número correlativo para Libro IVA Soportado
    num_factura_proveedor text,
    fecha date NOT NULL,
    base_imponible numeric DEFAULT 0,
    iva_importe numeric DEFAULT 0,
    retencion_pct numeric DEFAULT 0,
    retencion_importe numeric DEFAULT 0,
    total numeric DEFAULT 0,
    archivo_url text, -- URL del PDF en Storage
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coste_lineas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    coste_id uuid REFERENCES public.costes(id) ON DELETE CASCADE,
    unidades numeric DEFAULT 1,
    descripcion text,
    precio_unitario numeric DEFAULT 0,
    iva_pct numeric DEFAULT 21
);

-- 6. TESORERÍA
CREATE TABLE IF NOT EXISTS public.pagos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    coste_id uuid REFERENCES public.costes(id) ON DELETE CASCADE,
    fecha date NOT NULL,
    importe numeric NOT NULL,
    forma_pago text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cobros (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    venta_id uuid REFERENCES public.ventas(id) ON DELETE CASCADE,
    fecha date NOT NULL,
    importe numeric NOT NULL,
    forma_pago text,
    created_at timestamptz DEFAULT now()
);

-- 7. TRIGGERS AUTOMÁTICOS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre)
  VALUES (new.id, new.email, split_part(new.email, '@', 1));
  
  INSERT INTO public.perfil_negocio (user_id, nombre, email)
  VALUES (new.id, split_part(new.email, '@', 1), new.email);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. SEGURIDAD RLS (Row Level Security)
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.costes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coste_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobros ENABLE ROW LEVEL SECURITY;

-- Políticas de Propietario (Acceso total solo a sus datos)
CREATE POLICY "RLS_Perfiles_Self" ON public.perfiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "RLS_PerfilNegocio_Owner" ON public.perfil_negocio FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Clientes_Owner" ON public.clientes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Proveedores_Owner" ON public.proveedores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Proyectos_Owner" ON public.proyectos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Ventas_Owner" ON public.ventas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Costes_Owner" ON public.costes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Pagos_Owner" ON public.pagos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Cobros_Owner" ON public.cobros FOR ALL USING (auth.uid() = user_id);

-- Políticas para tablas hijas (Acceso basado en el registro padre)
CREATE POLICY "RLS_ProyectoLineas_Visibility" ON public.proyecto_lineas FOR ALL USING (
    EXISTS (SELECT 1 FROM proyectos WHERE proyectos.id = proyecto_lineas.proyecto_id AND proyectos.user_id = auth.uid())
);
CREATE POLICY "RLS_VentaLineas_Visibility" ON public.venta_lineas FOR ALL USING (
    EXISTS (SELECT 1 FROM ventas WHERE ventas.id = venta_lineas.venta_id AND ventas.user_id = auth.uid())
);
CREATE POLICY "RLS_CosteLineas_Visibility" ON public.coste_lineas FOR ALL USING (
    EXISTS (SELECT 1 FROM costes WHERE costes.id = coste_lineas.coste_id AND costes.user_id = auth.uid())
);

-- 9. ÍNDICES DE RENDIMIENTO
CREATE INDEX idx_costes_user ON public.costes(user_id);
CREATE INDEX idx_ventas_user ON public.ventas(user_id);
CREATE INDEX idx_proyectos_user ON public.proyectos(user_id);
CREATE INDEX idx_pagos_coste ON public.pagos(coste_id);
CREATE INDEX idx_cobros_venta ON public.cobros(venta_id);
