-- GESTIÓN PRO v3.2 - ESQUEMA COMPLETO Y POLÍTICAS IDEMPOTENTES
-- Copia y pega esto en el SQL Editor de Supabase si necesitas restaurar tablas

-- Extensiones
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
    cp TEXT,
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
    direccion TEXT,
    cp TEXT,
    poblacion TEXT,
    provincia TEXT,
    user_id UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABLA DE PROYECTOS
CREATE TABLE IF NOT EXISTS proyectos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    serie TEXT DEFAULT 'P',
    num_proyecto TEXT,
    fecha DATE DEFAULT CURRENT_DATE,
    base_imponible NUMERIC DEFAULT 0,
    iva_pct INT DEFAULT 21,
    iva_importe NUMERIC DEFAULT 0,
    retencion_pct NUMERIC DEFAULT 0,
    retencion_importe NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    estado TEXT DEFAULT 'Abierto',
    descripcion TEXT,
    user_id UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA DE LÍNEAS DE PROYECTO
CREATE TABLE IF NOT EXISTS proyecto_lineas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
    unidades NUMERIC DEFAULT 1,
    descripcion TEXT,
    precio_unitario NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. TABLA DE PERFIL DE NEGOCIO (Soporte Multi-usuario)
CREATE TABLE IF NOT EXISTS perfil_negocio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT DEFAULT 'Mi Empresa',
    nif TEXT DEFAULT '',
    cuenta_bancaria TEXT DEFAULT '',
    direccion TEXT DEFAULT '',
    cp TEXT DEFAULT '',
    poblacion TEXT DEFAULT '',
    provincia TEXT DEFAULT '',
    gemini_key TEXT DEFAULT '',
    tiene_retencion BOOLEAN DEFAULT FALSE,
    irpf_default NUMERIC DEFAULT 0,
    user_id UUID DEFAULT auth.uid() UNIQUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. TABLAS DE IMPUESTOS
CREATE TABLE IF NOT EXISTS tipos_iva (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    valor NUMERIC NOT NULL,
    user_id UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, valor)
);

CREATE TABLE IF NOT EXISTS tipos_irpf (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    valor NUMERIC NOT NULL,
    user_id UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, valor)
);

-- RLS (SEGURIDAD)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfil_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_iva ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_irpf ENABLE ROW LEVEL SECURITY;

-- Políticas Idempotentes
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "RLS_Clientes" ON clientes;
    CREATE POLICY "RLS_Clientes" ON clientes FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "RLS_Proveedores" ON proveedores;
    CREATE POLICY "RLS_Proveedores" ON proveedores FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "RLS_Proyectos" ON proyectos;
    CREATE POLICY "RLS_Proyectos" ON proyectos FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "RLS_Perfil" ON perfil_negocio;
    CREATE POLICY "RLS_Perfil" ON perfil_negocio FOR ALL USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "RLS_IVA" ON tipos_iva;
    CREATE POLICY "RLS_IVA" ON tipos_iva FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "RLS_IRPF" ON tipos_irpf;
    CREATE POLICY "RLS_IRPF" ON tipos_irpf FOR ALL USING (auth.uid() = user_id);
END $$;
