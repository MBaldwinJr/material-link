-- P0 / InterMat: restrictive RLS + atomic loan/return RPCs.
-- REVIEW BEFORE APPLYING: no operators are automatically admitted.
-- Bootstrap the first administrator using a trusted database connection.
-- This migration is NOT automatically applied by opening the pull request.

CREATE TABLE IF NOT EXISTS public.inter_mat_operadores (
  usuario_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  papel TEXT NOT NULL CHECK (papel IN ('admin', 'gestor', 'operador', 'consulta')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inter_mat_operadores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inter_mat_operadores FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.inter_mat_operadores TO authenticated;
DROP POLICY IF EXISTS "Operator reads own membership" ON public.inter_mat_operadores;
CREATE POLICY "Operator reads own membership" ON public.inter_mat_operadores
  FOR SELECT TO authenticated USING (usuario_id = (SELECT auth.uid()));

-- Replace all legacy broad policies, including FOR ALL TO anon, and grants.
DO $$
DECLARE
  target TEXT;
  pol RECORD;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'empresas','produtos','emprestimos','devolucoes',
    'movimentacoes_estoque','auditoria','motoristas','veiculos'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target);
    FOR pol IN SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = target
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, target);
    END LOOP;
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated', target);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', target);
    EXECUTE format(
      'CREATE POLICY "intermat_member_select" ON public.%I FOR SELECT TO authenticated
       USING (EXISTS (SELECT 1 FROM public.inter_mat_operadores m
         WHERE m.usuario_id = (SELECT auth.uid()) AND m.ativo))', target);
  END LOOP;
END $$;

-- Financial audit is confidential, even among signed-in operators.
DROP POLICY "intermat_member_select" ON public.auditoria;
CREATE POLICY "intermat_manager_audit_select" ON public.auditoria
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.inter_mat_operadores m
      WHERE m.usuario_id = (SELECT auth.uid())
        AND m.ativo AND m.papel IN ('admin','gestor'))
  );

-- Catalog writes are limited to managers. Direct stock-balance UPDATE is
-- intentionally excluded: loan and return stock movements go through RPC.
GRANT INSERT, UPDATE ON public.empresas TO authenticated;
CREATE POLICY "intermat_manager_company_insert" ON public.empresas
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.inter_mat_operadores m
      WHERE m.usuario_id = (SELECT auth.uid()) AND m.ativo
      AND m.papel IN ('admin','gestor')));
CREATE POLICY "intermat_manager_company_update" ON public.empresas
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.inter_mat_operadores m
      WHERE m.usuario_id = (SELECT auth.uid()) AND m.ativo
      AND m.papel IN ('admin','gestor')))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.inter_mat_operadores m
      WHERE m.usuario_id = (SELECT auth.uid()) AND m.ativo
      AND m.papel IN ('admin','gestor')));

GRANT INSERT ON public.produtos TO authenticated;
GRANT UPDATE (
  codigo, codigo_barras, descricao, marca, categoria, fornecedor,
  unidade, custo_centavos, venda_centavos, estoque_minimo, localizacao
) ON public.produtos TO authenticated;
CREATE POLICY "intermat_manager_product_insert" ON public.produtos
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.inter_mat_operadores m
      WHERE m.usuario_id = (SELECT auth.uid()) AND m.ativo
      AND m.papel IN ('admin','gestor')));
CREATE POLICY "intermat_manager_product_update" ON public.produtos
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.inter_mat_operadores m
      WHERE m.usuario_id = (SELECT auth.uid()) AND m.ativo
      AND m.papel IN ('admin','gestor')))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.inter_mat_operadores m
      WHERE m.usuario_id = (SELECT auth.uid()) AND m.ativo
      AND m.papel IN ('admin','gestor')));

GRANT INSERT, UPDATE ON public.motoristas, public.veiculos TO authenticated;
DO $$
DECLARE target TEXT;
BEGIN
  FOREACH target IN ARRAY ARRAY['motoristas','veiculos'] LOOP
    EXECUTE format(
      'CREATE POLICY "intermat_manager_insert" ON public.%I FOR INSERT TO authenticated
       WITH CHECK (EXISTS (SELECT 1 FROM public.inter_mat_operadores m
         WHERE m.usuario_id = (SELECT auth.uid()) AND m.ativo
           AND m.papel IN (''admin'',''gestor'')))', target);
    EXECUTE format(
      'CREATE POLICY "intermat_manager_update" ON public.%I FOR UPDATE TO authenticated
       USING (EXISTS (SELECT 1 FROM public.inter_mat_operadores m
         WHERE m.usuario_id = (SELECT auth.uid()) AND m.ativo
           AND m.papel IN (''admin'',''gestor'')))
       WITH CHECK (EXISTS (SELECT 1 FROM public.inter_mat_operadores m
         WHERE m.usuario_id = (SELECT auth.uid()) AND m.ativo
           AND m.papel IN (''admin'',''gestor'')))', target);
  END LOOP;
END $$;

-- No direct writes to loan, return, movements, or audit tables for API users.
REVOKE INSERT, UPDATE, DELETE ON public.emprestimos, public.devolucoes,
  public.movimentacoes_estoque, public.auditoria FROM anon, authenticated;
-- Existing rows are not rewritten. NOT VALID guards new writes without
-- requiring historical data repair during deployment.
ALTER TABLE public.produtos
  ADD CONSTRAINT intermat_estoque_nao_negativo CHECK (estoque_atual >= 0) NOT VALID;
ALTER TABLE public.emprestimos
  ADD CONSTRAINT intermat_devolvido_no_intervalo
  CHECK (quantidade_devolvida >= 0 AND quantidade_devolvida <= quantidade) NOT VALID;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;

-- Sequence preserves existing EMP-* numbers. Gaps are valid; collisions aren't.
CREATE SEQUENCE IF NOT EXISTS public.emprestimos_numero_seq START 201;
SELECT setval(
  'public.emprestimos_numero_seq',
  GREATEST(200, COALESCE((
    SELECT MAX(substring(numero FROM '^EMP-([0-9]+)$')::BIGINT)
    FROM public.emprestimos WHERE numero ~ '^EMP-[0-9]+$'
  ), 200)),
  true
);
REVOKE ALL ON SEQUENCE public.emprestimos_numero_seq FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_inter_mat_emprestimos_abertos_empresa
  ON public.emprestimos (empresa_id) WHERE status <> 'devolvido';

-- Membership is checked inside privileged functions on every call.
CREATE OR REPLACE FUNCTION app_private.require_operator()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_user UUID := (SELECT auth.uid());
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.inter_mat_operadores o
    WHERE o.usuario_id = v_user AND o.ativo
      AND o.papel IN ('admin','gestor','operador')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: operador não autorizado' USING ERRCODE = '42501';
  END IF;
  RETURN v_user;
END $$;

CREATE OR REPLACE FUNCTION app_private.registrar_emprestimo(
  p_empresa_id UUID, p_produto_id UUID, p_quantidade NUMERIC,
  p_valor_unitario_centavos BIGINT, p_data TIMESTAMPTZ,
  p_prazo_devolucao TIMESTAMPTZ, p_responsavel TEXT,
  p_motorista TEXT, p_veiculo TEXT, p_observacoes TEXT
) RETURNS public.emprestimos
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user UUID;
  v_empresa public.empresas%ROWTYPE;
  v_produto public.produtos%ROWTYPE;
  v_emprestimo public.emprestimos%ROWTYPE;
  v_numero TEXT;
  v_exposicao NUMERIC;
BEGIN
  v_user := app_private.require_operator();
  IF p_quantidade IS NULL OR p_quantidade <= 0 OR p_quantidade <> trunc(p_quantidade)
    OR p_valor_unitario_centavos IS NULL OR p_valor_unitario_centavos < 0
    OR p_data IS NULL OR p_prazo_devolucao IS NULL
    OR p_prazo_devolucao < p_data
    OR nullif(trim(p_responsavel), '') IS NULL THEN
    RAISE EXCEPTION 'Dados do empréstimo inválidos' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_empresa FROM public.empresas WHERE id = p_empresa_id FOR UPDATE;
  IF NOT FOUND OR v_empresa.status <> 'ativa' THEN
    RAISE EXCEPTION 'Empresa inexistente, suspensa ou bloqueada' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO v_produto FROM public.produtos WHERE id = p_produto_id FOR UPDATE;
  IF NOT FOUND OR v_produto.estoque_atual < p_quantidade THEN
    RAISE EXCEPTION 'Estoque insuficiente para o empréstimo' USING ERRCODE = '23514';
  END IF;
  IF v_empresa.limite_centavos > 0 THEN
    SELECT COALESCE(SUM((quantidade - quantidade_devolvida) * valor_unitario_centavos), 0)
      INTO v_exposicao FROM public.emprestimos
      WHERE empresa_id = p_empresa_id;
    IF v_exposicao + p_quantidade * p_valor_unitario_centavos > v_empresa.limite_centavos THEN
      RAISE EXCEPTION 'Limite de empréstimo da empresa excedido' USING ERRCODE = '23514';
    END IF;
  END IF;
  v_numero := 'EMP-' || lpad(nextval('public.emprestimos_numero_seq'::regclass)::TEXT, 5, '0');
  INSERT INTO public.emprestimos (
    numero, empresa_id, produto_id, quantidade, quantidade_devolvida,
    valor_unitario_centavos, data, prazo_devolucao, responsavel,
    motorista, veiculo, observacoes, status
  ) VALUES (
    v_numero, p_empresa_id, p_produto_id, p_quantidade, 0,
    p_valor_unitario_centavos, p_data, p_prazo_devolucao, p_responsavel,
    p_motorista, p_veiculo, p_observacoes, 'aberto'
  ) RETURNING * INTO v_emprestimo;
  UPDATE public.produtos SET estoque_atual = estoque_atual - p_quantidade
    WHERE id = p_produto_id;
  INSERT INTO public.movimentacoes_estoque (
    produto_id, empresa_id, tipo, quantidade, usuario, data, origem
  ) VALUES (p_produto_id, p_empresa_id, 'saida', p_quantidade, v_user::TEXT, p_data, v_numero);
  INSERT INTO public.auditoria (usuario, acao, entidade, detalhes)
    VALUES (v_user::TEXT, 'Criação de empréstimo', v_numero,
      jsonb_build_object('emprestimo_id', v_emprestimo.id, 'quantidade', p_quantidade));
  RETURN v_emprestimo;
END $$;

CREATE OR REPLACE FUNCTION app_private.registrar_devolucao(
  p_emprestimo_id UUID, p_tipo TEXT, p_quantidade NUMERIC,
  p_responsavel TEXT, p_observacoes TEXT
) RETURNS public.devolucoes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user UUID;
  v_emprestimo public.emprestimos%ROWTYPE;
  v_devolucao public.devolucoes%ROWTYPE;
  v_pendente NUMERIC;
  v_novo_devolvido NUMERIC;
BEGIN
  v_user := app_private.require_operator();
  IF p_tipo IS NULL OR p_tipo NOT IN ('total','parcial','troca','avaria','perda')
     OR p_quantidade IS NULL OR p_quantidade <= 0 OR p_quantidade <> trunc(p_quantidade)
     OR nullif(trim(p_responsavel), '') IS NULL THEN
    RAISE EXCEPTION 'Dados da devolução inválidos' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_emprestimo FROM public.emprestimos
    WHERE id = p_emprestimo_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empréstimo não encontrado' USING ERRCODE = '23503';
  END IF;
  v_pendente := v_emprestimo.quantidade - v_emprestimo.quantidade_devolvida;
  IF p_quantidade > v_pendente THEN
    RAISE EXCEPTION 'Quantidade excede o saldo pendente' USING ERRCODE = '23514';
  END IF;
  IF p_tipo = 'total' AND p_quantidade <> v_pendente THEN
    RAISE EXCEPTION 'Devolução total deve quitar o saldo pendente' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.devolucoes (
    emprestimo_id, tipo, quantidade, responsavel, observacoes
  ) VALUES (
    p_emprestimo_id, p_tipo, p_quantidade, p_responsavel, p_observacoes
  ) RETURNING * INTO v_devolucao;
  v_novo_devolvido := v_emprestimo.quantidade_devolvida + p_quantidade;
  UPDATE public.emprestimos
    SET quantidade_devolvida = v_novo_devolvido,
        status = CASE
          WHEN v_novo_devolvido = quantidade THEN 'devolvido'
          WHEN prazo_devolucao < now() THEN 'atrasado'
          ELSE 'parcial'
        END
    WHERE id = p_emprestimo_id;
  -- Preserve existing stock semantics: only physical returns increase stock.
  -- Troca/avaria/perda settle the pending quantity, but do not add stock.
  IF p_tipo IN ('total','parcial') THEN
    UPDATE public.produtos
      SET estoque_atual = estoque_atual + p_quantidade
      WHERE id = v_emprestimo.produto_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto do empréstimo não encontrado' USING ERRCODE = '23503';
    END IF;
    INSERT INTO public.movimentacoes_estoque (
      produto_id, empresa_id, tipo, quantidade, usuario, data, origem
    ) VALUES (
      v_emprestimo.produto_id, v_emprestimo.empresa_id,
      'entrada', p_quantidade, v_user::TEXT, now(), v_emprestimo.numero
    );
  END IF;
  INSERT INTO public.auditoria (usuario, acao, entidade, detalhes)
    VALUES (v_user::TEXT, 'Devolução (' || p_tipo || ')', v_emprestimo.numero,
      jsonb_build_object('devolucao_id', v_devolucao.id, 'quantidade', p_quantidade));
  RETURN v_devolucao;
END $$;

-- Narrow, invoker-mode API wrappers; privileged implementation stays in
-- app_private (not in PostgREST's exposed public schema).
CREATE OR REPLACE FUNCTION public.registrar_emprestimo_seguro(
  p_empresa_id UUID, p_produto_id UUID, p_quantidade NUMERIC,
  p_valor_unitario_centavos BIGINT, p_data TIMESTAMPTZ,
  p_prazo_devolucao TIMESTAMPTZ, p_responsavel TEXT,
  p_motorista TEXT, p_veiculo TEXT, p_observacoes TEXT
) RETURNS public.emprestimos LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT app_private.registrar_emprestimo(
  p_empresa_id, p_produto_id, p_quantidade, p_valor_unitario_centavos,
  p_data, p_prazo_devolucao, p_responsavel, p_motorista, p_veiculo, p_observacoes
) $$;

CREATE OR REPLACE FUNCTION public.registrar_devolucao_segura(
  p_emprestimo_id UUID, p_tipo TEXT, p_quantidade NUMERIC,
  p_responsavel TEXT, p_observacoes TEXT
) RETURNS public.devolucoes LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT app_private.registrar_devolucao(
  p_emprestimo_id, p_tipo, p_quantidade, p_responsavel, p_observacoes
) $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.require_operator() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.registrar_emprestimo(
  UUID, UUID, NUMERIC, BIGINT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.registrar_devolucao(
  UUID, TEXT, NUMERIC, TEXT, TEXT
) TO authenticated;

REVOKE ALL ON FUNCTION public.registrar_emprestimo_seguro(
  UUID, UUID, NUMERIC, BIGINT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_emprestimo_seguro(
  UUID, UUID, NUMERIC, BIGINT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
REVOKE ALL ON FUNCTION public.registrar_devolucao_segura(
  UUID, TEXT, NUMERIC, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_devolucao_segura(
  UUID, TEXT, NUMERIC, TEXT, TEXT
) TO authenticated;

-- Catalog writes are audited by the database, not by untrusted browser data.
CREATE OR REPLACE FUNCTION app_private.audit_catalog_write()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.auditoria(usuario, acao, entidade, detalhes)
    VALUES (coalesce((SELECT auth.uid())::TEXT, 'sistema'), TG_OP,
      TG_TABLE_NAME, jsonb_build_object('registro_id', NEW.id));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app_private.audit_catalog_write() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS tr_inter_mat_empresas_audit ON public.empresas;
CREATE TRIGGER tr_inter_mat_empresas_audit
  AFTER INSERT OR UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION app_private.audit_catalog_write();
DROP TRIGGER IF EXISTS tr_inter_mat_produtos_audit ON public.produtos;
CREATE TRIGGER tr_inter_mat_produtos_audit
  AFTER INSERT OR UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION app_private.audit_catalog_write();
