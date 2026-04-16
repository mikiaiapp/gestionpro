-- ----------------------------------------------------------------------------------
-- GESTIONPRO - DATABASE SCHEMA V2
-- ----------------------------------------------------------------------------------

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: Perfil de Negocio
CREATE TABLE IF NOT EXISTS perfil_negocio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    nif TEXT NOT NULL,
    direccion TEXT,
    cp TEXT,
    poblacion TEXT,
    provincia TEXT,
    telefono TEXT,
    email TEXT,
    web TEXT,
    cuenta_bancaria TEXT,
    logo_url TEXT,
    gemini_key TEXT,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA: Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    nif TEXT NOT NULL,
    direccion TEXT,
    codigo_postal TEXT,
    poblacion TEXT,
    provincia TEXT,
    telefono TEXT,
    email TEXT,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA: Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    nif TEXT NOT NULL,
    direccion TEXT,
    codigo_postal TEXT,
    poblacion TEXT,
    provincia TEXT,
    telefono TEXT,
    email TEXT,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLA: Proyectos
-- Evolucionado para ser un documento de presupuesto completo
CREATE TABLE IF NOT EXISTS proyectos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    cliente_id UUID REFERENCES clientes(id),
    serie TEXT DEFAULT 'P',
    num_proyecto TEXT, -- Referencia/Número de presupuesto
    fecha DATE DEFAULT CURRENT_DATE,
    estado TEXT DEFAULT 'Abierto',
    base_imponible NUMERIC(12,2) DEFAULT 0,
    iva_pct NUMERIC(4,2) DEFAULT 21,
    iva_importe NUMERIC(12,2) DEFAULT 0,
    retencion_pct NUMERIC(4,2) DEFAULT 0,
    retencion_importe NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLA: Líneas de Proyecto
CREATE TABLE IF NOT EXISTS proyecto_lineas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
    unidades NUMERIC(10,2) DEFAULT 1,
    descripcion TEXT NOT NULL,
    precio_unitario NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) GENERATED ALWAYS AS (unidades * precio_unitario) STORED,
    user_id UUID NOT NULL DEFAULT auth.uid()
);

-- 7. TABLA: Formas de Cobro
CREATE TABLE IF NOT EXISTS formas_cobro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL, -- Ej: Transferencia, Efectivo, Recibo
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABLA: Ventas (Facturas Emitidas)
CREATE TABLE IF NOT EXISTS ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serie TEXT DEFAULT 'A',
    num_factura TEXT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    cliente_id UUID REFERENCES clientes(id),
    proyecto_id UUID REFERENCES proyectos(id),
    forma_cobro_id UUID REFERENCES formas_cobro(id),
    base_imponible NUMERIC(12,2) NOT NULL DEFAULT 0,
    iva_pct NUMERIC(4,2) NOT NULL DEFAULT 21,
    iva_importe NUMERIC(12,2) NOT NULL DEFAULT 0,
    retencion_pct NUMERIC(4,2) DEFAULT 0,
    retencion_importe NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    pagada BOOLEAN DEFAULT FALSE,
    fecha_vencimiento DATE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TABLA: Líneas de Venta
CREATE TABLE IF NOT EXISTS venta_lineas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    unidades NUMERIC(10,2) DEFAULT 1,
    descripcion TEXT NOT NULL,
    precio_unitario NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) GENERATED ALWAYS AS (unidades * precio_unitario) STORED,
    user_id UUID NOT NULL DEFAULT auth.uid()
);

-- 10. TABLA: Cobros (Pagos recibidos de facturas)
CREATE TABLE IF NOT EXISTS cobros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    fecha DATE DEFAULT CURRENT_DATE,
    importe NUMERIC(12,2) NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. TABLA: Costes (Facturas Recibidas / Gastos)
CREATE TABLE IF NOT EXISTS costes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serie TEXT DEFAULT 'A',
    num_interno TEXT, -- Nuestro contador propio
    num_factura_proveedor TEXT, -- El número de la factura original del proveedor
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    proveedor_id UUID REFERENCES proveedores(id),
    tipo_gasto TEXT DEFAULT 'general', -- 'general', 'proyecto', etc.
    proyecto_id UUID REFERENCES proyectos(id),
    base_imponible NUMERIC(12,2) NOT NULL DEFAULT 0,
    iva_pct NUMERIC(4,2) DEFAULT 21,
    iva_importe NUMERIC(12,2) DEFAULT 0,
    retencion_pct NUMERIC(4,2) DEFAULT 0,
    retencion_importe NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    pagado BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. TABLA: Líneas de Coste
CREATE TABLE IF NOT EXISTS coste_lineas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coste_id UUID REFERENCES costes(id) ON DELETE CASCADE,
    unidades NUMERIC(10,2) DEFAULT 1,
    descripcion TEXT NOT NULL,
    precio_unitario NUMERIC(12,2) DEFAULT 0,
    iva_pct NUMERIC(4,2) DEFAULT 21,
    total NUMERIC(12,2) GENERATED ALWAYS AS (unidades * precio_unitario) STORED,
    user_id UUID NOT NULL DEFAULT auth.uid()
);

-- ----------------------------------------------------------------------------------
-- SEGURIDAD (Row Level Security - RLS)
-- ----------------------------------------------------------------------------------

ALTER TABLE perfil_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE formas_cobro ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE costes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coste_lineas ENABLE ROW LEVEL SECURITY;

-- Políticas simplificadas: El usuario solo ve sus propios datos
CREATE POLICY "RLS_PERFIL" ON perfil_negocio FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_CLIENTES" ON clientes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_PROVEEDORES" ON proveedores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_PROYECTOS" ON proyectos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_PROYECTO_LINEAS" ON proyecto_lineas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_FORMAS_COBRO" ON formas_cobro FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_VENTAS" ON ventas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_VENTA_LINEAS" ON venta_lineas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_COBROS" ON cobros FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_COSTES" ON costes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS_COSTE_LINEAS" ON coste_lineas FOR ALL USING (auth.uid() = user_id);
