const fs = require('fs');

async function run() {
  const schema = `-- ==========================================
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
`;

  const migration = `-- ==========================================
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
`;

  fs.writeFileSync('supabase_schema.sql', schema);
  fs.writeFileSync('MIGRACION_ACTUALIZACION.sql', migration);
  console.log('✅ Archivos SQL generados satisfactoriamente.');
}

run();
