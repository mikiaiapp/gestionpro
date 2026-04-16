-- GESTIÓN PRO v3.0 - ESQUEMA COMPLETO DE BASE DE DATOS
-- Copia y pega esto en el SQL Editor de tu proyecto de Supabase

-- habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    nif TEXT,
    email TEXT,
    telefono TEXT,
    direccion TEXT,
    poblacion TEXT,
    provincia TEXT,
    codigo_postal TEXT,
    user_id UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. TABLA DE PROVEEDORES
CREATE TABLE IF NOT EXISTS proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    nif TEXT,
    email TEXT,
    telefono TEXT,
    user_id UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABLA DE PROYECTOS
CREATE TABLE IF NOT EXISTS proyectos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    presupuesto NUMERIC DEFAULT 0,
    coste_previsto NUMERIC DEFAULT 0,
    estado TEXT DEFAULT 'Abierto',
    descripcion TEXT,
    user_id UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA DE FORMAS DE COBRO
CREATE TABLE IF NOT EXISTS formas_cobro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    user_id UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. TABLA DE VENTAS (FACTURAS EMITIDAS)
CREATE TABLE IF NOT EXISTS ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serie TEXT DEFAULT 'A',
    num_factura TEXT NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
    forma_cobro_id UUID REFERENCES formas_cobro(id),
    base_imponible NUMERIC DEFAULT 0,
    iva_pct INT DEFAULT 21,
    iva_importe NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    estado_cobro TEXT DEFAULT 'Pendiente',
    user_id UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. TABLA DE LÍNEAS DE VENTA
CREATE TABLE IF NOT EXISTS venta_lineas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    unidades NUMERIC DEFAULT 1,
    descripcion TEXT,
    precio_unitario NUMERIC DEFAULT 0,
    total NUMERIC GENERATED ALWAYS AS (unidades * precio_unitario) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. TABLA DE COSTES (FACTURAS RECIBIDAS)
CREATE TABLE IF NOT EXISTS costes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serie TEXT DEFAULT 'A',
    num_interno TEXT,
    num_factura_proveedor TEXT,
    fecha DATE DEFAULT CURRENT_DATE,
    proveedor_id UUID REFERENCES proveedores(id) ON DELETE CASCADE,
    proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
    tipo_gasto TEXT DEFAULT 'general',
    base_imponible NUMERIC DEFAULT 0,
    iva_pct INT DEFAULT 21,
    iva_importe NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    estado_pago TEXT DEFAULT 'Pendiente',
    user_id UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. TABLA DE PERFIL DE NEGOCIO
CREATE TABLE IF NOT EXISTS perfil_negocio (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    nombre TEXT DEFAULT 'Mi Empresa',
    nif TEXT DEFAULT '',
    cuenta_bancaria TEXT DEFAULT '',
    direccion TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    gemini_key TEXT DEFAULT '',
    user_id UUID DEFAULT auth.uid(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. TABLA DE PERFILES DE USUARIO (Para la pantalla de Usuarios)
CREATE TABLE IF NOT EXISTS perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT,
    email TEXT,
    rol TEXT DEFAULT 'Usuario',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- CONFIGURACIÓN DE SEGURIDAD (RLS)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE costes ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE formas_cobro ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfil_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS
CREATE POLICY "RLS_Clientes" ON clientes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Proveedores" ON proveedores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Proyectos" ON proyectos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Ventas" ON ventas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Costes" ON costes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Formas_Cobro" ON formas_cobro FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Perfil" ON perfil_negocio FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_Usuarios" ON perfiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "RLS_Venta_Lineas" ON venta_lineas FOR ALL USING (
    EXISTS (SELECT 1 FROM ventas WHERE ventas.id = venta_lineas.venta_id AND ventas.user_id = auth.uid())
);
