-- SCRIPT DE ACTIVACIÓN DE RLS (ROW LEVEL SECURITY) PARA AISLAMIENTO MULTI-TENANT TOTAL
-- Ejecutar en el SQL Editor de Supabase para blindar la base de datos a nivel de motor.

-- 1. Habilitar RLS en todas las tablas de negocio
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfil_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE costes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_iva ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_irpf ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Seguridad para la tabla de Perfiles (Solo el propio usuario)
CREATE POLICY "Usuarios pueden ver su propio perfil" ON perfiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON perfiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. Políticas Genéricas para tablas con columna 'user_id'
-- Reemplazar {table_name} por cada una de las tablas de negocio

-- Perfil Negocio
CREATE POLICY "Acceso total a perfil_negocio por user_id" ON perfil_negocio
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Clientes
CREATE POLICY "Acceso total a clientes por user_id" ON clientes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Proveedores
CREATE POLICY "Acceso total a proveedores por user_id" ON proveedores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Proyectos
CREATE POLICY "Acceso total a proyectos por user_id" ON proyectos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Líneas de Proyecto
CREATE POLICY "Acceso total a proyecto_lineas por user_id" ON proyecto_lineas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Ventas
CREATE POLICY "Acceso total a ventas por user_id" ON ventas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Costes
CREATE POLICY "Acceso total a costes por user_id" ON costes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Cobros
CREATE POLICY "Acceso total a cobros por user_id" ON cobros
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Pagos
CREATE POLICY "Acceso total a pagos por user_id" ON pagos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tipos IVA
CREATE POLICY "Acceso total a tipos_iva por user_id" ON tipos_iva
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tipos IRPF
CREATE POLICY "Acceso total a tipos_irpf por user_id" ON tipos_irpf
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Backups
CREATE POLICY "Acceso total a backups por user_id" ON backups
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Políticas para Supabase Storage (Bucket: facturas, logos)
-- NOTA: Estas se configuran en la sección de Storage de Supabase, pero aquí está el concepto:
-- Bucket 'facturas': (auth.uid()::text = (storage.foldername(name))[1])
-- Bucket 'logos': (auth.uid()::text = (storage.foldername(name))[1])
