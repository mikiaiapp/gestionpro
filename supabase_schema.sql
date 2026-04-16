-- GESTIÓN PRO v3.2 - ESQUEMA COMPLETO Y CORREGIDO
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CREACIÓN DE TABLAS (Solo si no existen)
CREATE TABLE IF NOT EXISTS clientes (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), nombre TEXT NOT NULL, nif TEXT, email TEXT, direccion TEXT, poblacion TEXT, provincia TEXT, codigo_postal TEXT, user_id UUID DEFAULT auth.uid(), created_at TIMESTAMP WITH TIME ZONE DEFAULT now());
CREATE TABLE IF NOT EXISTS proveedores (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), nombre TEXT NOT NULL, nif TEXT, email TEXT, direccion TEXT, codigo_postal TEXT, poblacion TEXT, provincia TEXT, user_id UUID DEFAULT auth.uid(), created_at TIMESTAMP WITH TIME ZONE DEFAULT now());
CREATE TABLE IF NOT EXISTS proyectos (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), nombre TEXT NOT NULL, cliente_id UUID REFERENCES clientes(id), serie TEXT DEFAULT 'P', num_proyecto TEXT, fecha DATE DEFAULT CURRENT_DATE, base_imponible NUMERIC DEFAULT 0, iva_pct INT DEFAULT 21, iva_importe NUMERIC DEFAULT 0, retencion_pct NUMERIC DEFAULT 0, retencion_importe NUMERIC DEFAULT 0, total NUMERIC DEFAULT 0, estado TEXT DEFAULT 'Abierto', descripcion TEXT, user_id UUID DEFAULT auth.uid(), created_at TIMESTAMP WITH TIME ZONE DEFAULT now());
CREATE TABLE IF NOT EXISTS proyecto_lineas (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE, unidades NUMERIC DEFAULT 1, descripcion TEXT, precio_unitario NUMERIC DEFAULT 0, total NUMERIC GENERATED ALWAYS AS (unidades * precio_unitario) STORED);
CREATE TABLE IF NOT EXISTS formas_cobro (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), nombre TEXT NOT NULL, user_id UUID DEFAULT auth.uid());
CREATE TABLE IF NOT EXISTS ventas (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), serie TEXT DEFAULT 'A', num_factura TEXT NOT NULL, fecha DATE DEFAULT CURRENT_DATE, cliente_id UUID REFERENCES clientes(id), proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL, forma_cobro_id UUID REFERENCES formas_cobro(id), base_imponible NUMERIC DEFAULT 0, iva_pct INT DEFAULT 21, total NUMERIC DEFAULT 0, estado_cobro TEXT DEFAULT 'Pendiente', user_id UUID DEFAULT auth.uid(), created_at TIMESTAMP WITH TIME ZONE DEFAULT now());
CREATE TABLE IF NOT EXISTS venta_lineas (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE, unidades NUMERIC DEFAULT 1, descripcion TEXT, precio_unitario NUMERIC DEFAULT 0, total NUMERIC GENERATED ALWAYS AS (unidades * precio_unitario) STORED);
CREATE TABLE IF NOT EXISTS costes (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), num_interno TEXT, num_factura_proveedor TEXT, fecha DATE DEFAULT CURRENT_DATE, proveedor_id UUID REFERENCES proveedores(id), proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL, base_imponible NUMERIC DEFAULT 0, total NUMERIC DEFAULT 0, user_id UUID DEFAULT auth.uid());
CREATE TABLE IF NOT EXISTS coste_lineas (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), coste_id UUID REFERENCES costes(id) ON DELETE CASCADE, unidades NUMERIC DEFAULT 1, descripcion TEXT, precio_unitario NUMERIC DEFAULT 0, iva_pct INT DEFAULT 21, total NUMERIC GENERATED ALWAYS AS (unidades * precio_unitario) STORED);
CREATE TABLE IF NOT EXISTS tipos_iva (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), nombre TEXT NOT NULL, valor NUMERIC NOT NULL, user_id UUID DEFAULT auth.uid());
CREATE TABLE IF NOT EXISTS tipos_irpf (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), nombre TEXT NOT NULL, valor NUMERIC NOT NULL, user_id UUID DEFAULT auth.uid());
CREATE TABLE IF NOT EXISTS perfil_negocio (id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), nombre TEXT DEFAULT 'Mi Empresa', nif TEXT, cuenta_bancaria TEXT, direccion TEXT, cp TEXT, poblacion TEXT, provincia TEXT, gemini_key TEXT, tiene_retencion BOOLEAN DEFAULT FALSE, irpf_default NUMERIC DEFAULT 0, user_id UUID DEFAULT auth.uid());

-- 2. ACTIVAR RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE costes ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE coste_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE formas_cobro ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfil_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_iva ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_irpf ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS (Re-ejecutables)
DROP POLICY IF EXISTS "RLS_Clientes" ON clientes; CREATE POLICY "RLS_Clientes" ON clientes FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "RLS_Proveedores" ON proveedores; CREATE POLICY "RLS_Proveedores" ON proveedores FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "RLS_Proyectos" ON proyectos; CREATE POLICY "RLS_Proyectos" ON proyectos FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "RLS_Ventas" ON ventas; CREATE POLICY "RLS_Ventas" ON ventas FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "RLS_Costes" ON costes; CREATE POLICY "RLS_Costes" ON costes FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "RLS_Perfil" ON perfil_negocio; CREATE POLICY "RLS_Perfil" ON perfil_negocio FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "RLS_Tipos_IVA" ON tipos_iva; CREATE POLICY "RLS_Tipos_IVA" ON tipos_iva FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "RLS_Tipos_IRPF" ON tipos_irpf; CREATE POLICY "RLS_Tipos_IRPF" ON tipos_irpf FOR ALL USING (auth.uid() = user_id);

-- 4. CARGA DE TIPOS OFICIALES (ESPAÑA)
INSERT INTO tipos_iva (nombre, valor) VALUES ('General', 21), ('Reducido', 10), ('Superreducido', 4), ('Exento', 0) ON CONFLICT DO NOTHING;
INSERT INTO tipos_irpf (nombre, valor) VALUES ('Profesional General', 15), ('Nuevos Autónomos (7%)', 7), ('Alquileres / Otros', 19) ON CONFLICT DO NOTHING;
