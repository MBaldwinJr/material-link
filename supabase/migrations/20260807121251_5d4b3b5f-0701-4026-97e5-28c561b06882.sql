-- Permitir leitura e escrita para usuários autenticados na tabela empresas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;

-- Garantir acesso a outras tabelas operacionais
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emprestimos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devolucoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_estoque TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auditoria TO authenticated;

GRANT ALL ON public.produtos TO service_role;
GRANT ALL ON public.emprestimos TO service_role;
GRANT ALL ON public.devolucoes TO service_role;
GRANT ALL ON public.movimentacoes_estoque TO service_role;
GRANT ALL ON public.auditoria TO service_role;

-- Políticas de RLS para empresas
DROP POLICY IF EXISTS "Authenticated users can manage companies" ON public.empresas;
CREATE POLICY "Authenticated users can manage companies" ON public.empresas
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permitir anon para o preview
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emprestimos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devolucoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_estoque TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auditoria TO anon;

DROP POLICY IF EXISTS "Public access for companies" ON public.empresas;
CREATE POLICY "Public access for companies" ON public.empresas
FOR ALL TO anon USING (true) WITH CHECK (true);

-- RLS policies for other tables
DROP POLICY IF EXISTS "Public access for products" ON public.produtos;
CREATE POLICY "Public access for products" ON public.produtos FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for loans" ON public.emprestimos;
CREATE POLICY "Public access for loans" ON public.emprestimos FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for returns" ON public.devolucoes;
CREATE POLICY "Public access for returns" ON public.devolucoes FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for movements" ON public.movimentacoes_estoque;
CREATE POLICY "Public access for movements" ON public.movimentacoes_estoque FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for audit" ON public.auditoria;
CREATE POLICY "Public access for audit" ON public.auditoria FOR ALL TO anon USING (true) WITH CHECK (true);
