DROP POLICY IF EXISTS "RLS_Formas_Cobro" ON formas_cobro;
CREATE POLICY "RLS_Formas_Cobro" ON formas_cobro FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "RLS_Perfil" ON perfil_negocio;
CREATE POLICY "RLS_Perfil" ON perfil_negocio FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "RLS_Usuarios" ON perfiles;
CREATE POLICY "RLS_Usuarios" ON perfiles FOR ALL USING (auth.uid() = id);
DROP POLICY IF EXISTS "RLS_Venta_Lineas" ON venta_lineas;
CREATE POLICY "RLS_Venta_Lineas" ON venta_lineas FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM ventas
        WHERE ventas.id = venta_lineas.venta_id
            AND ventas.user_id = auth.uid()
    )
);
DROP POLICY IF EXISTS "RLS_Coste_Lineas" ON coste_lineas;
CREATE POLICY "RLS_Coste_Lineas" ON coste_lineas FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM costes
        WHERE costes.id = coste_lineas.coste_id
            AND costes.user_id = auth.uid()
    )
);
DROP POLICY IF EXISTS "RLS_Tipos_IVA" ON tipos_iva;
CREATE POLICY "RLS_Tipos_IVA" ON tipos_iva FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "RLS_Tipos_IRPF" ON tipos_irpf;
CREATE POLICY "RLS_Tipos_IRPF" ON tipos_irpf FOR ALL USING (auth.uid() = user_id);