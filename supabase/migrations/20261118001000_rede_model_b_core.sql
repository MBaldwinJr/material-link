-- Material Link / Modelo B — tenant-safe network core (no legacy data rewritten).
-- Deploy only after coordinated frontend/db rollout; tests use disposable PG.
-- All shared data uses explicit lender and borrower ownership.
CREATE SCHEMA IF NOT EXISTS rede_private;
REVOKE ALL ON SCHEMA rede_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA rede_private TO authenticated;

CREATE TABLE public.rede_organizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL CHECK (length(btrim(razao_social)) >= 2),
  nome_fantasia TEXT NOT NULL CHECK (length(btrim(nome_fantasia)) >= 2),
  cnpj TEXT NOT NULL UNIQUE CHECK (cnpj ~ '^[0-9]{14}$'),
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','ativa','suspensa','bloqueada')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.rede_membros (
  organizacao_id UUID NOT NULL REFERENCES public.rede_organizacoes(id),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel TEXT NOT NULL CHECK (papel IN
    ('proprietario','administrador','comercial','estoque','financeiro','consulta')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organizacao_id, usuario_id)
);
CREATE INDEX idx_rede_membros_user ON public.rede_membros(usuario_id, ativo);

CREATE TABLE public.rede_parcerias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id UUID NOT NULL REFERENCES public.rede_organizacoes(id),
  convidada_id UUID NOT NULL REFERENCES public.rede_organizacoes(id),
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','ativa','recusada','bloqueada')),
  solicitado_por UUID NOT NULL REFERENCES auth.users(id),
  respondido_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rede_partes_distintas CHECK (solicitante_id <> convidada_id)
);
CREATE UNIQUE INDEX uq_rede_parceria_par
  ON public.rede_parcerias(LEAST(solicitante_id,convidada_id),
     GREATEST(solicitante_id,convidada_id));

CREATE TABLE public.rede_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.rede_organizacoes(id),
  codigo TEXT NOT NULL CHECK (length(btrim(codigo)) > 0),
  descricao TEXT NOT NULL CHECK (length(btrim(descricao)) > 0),
  unidade TEXT NOT NULL DEFAULT 'UN',
  custo_privado_centavos BIGINT NOT NULL DEFAULT 0
    CHECK (custo_privado_centavos >= 0),
  preco_venda_privado_centavos BIGINT NOT NULL DEFAULT 0
    CHECK (preco_venda_privado_centavos >= 0),
  estoque NUMERIC(18,3) NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  reservado NUMERIC(18,3) NOT NULL DEFAULT 0
    CHECK (reservado >= 0 AND reservado <= estoque),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organizacao_id, codigo),
  UNIQUE(organizacao_id, id)
);
CREATE INDEX idx_rede_produtos_org_desc ON public.rede_produtos(organizacao_id,descricao);

-- Explicitly published offers never include private cost, margin, location
-- or the exact internal stock balance.
CREATE TABLE public.rede_ofertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.rede_organizacoes(id),
  produto_id UUID NOT NULL,
  descricao_publica TEXT NOT NULL,
  unidade TEXT NOT NULL,
  preco_acordavel_centavos BIGINT NOT NULL DEFAULT 0
    CHECK (preco_acordavel_centavos >= 0),
  ativa BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id, organizacao_id),
  FOREIGN KEY (organizacao_id, produto_id)
    REFERENCES public.rede_produtos(organizacao_id,id)
);
CREATE INDEX idx_rede_ofertas_org ON public.rede_ofertas(organizacao_id,ativa);

CREATE TABLE public.rede_emprestimos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedente_id UUID NOT NULL REFERENCES public.rede_organizacoes(id),
  tomadora_id UUID NOT NULL REFERENCES public.rede_organizacoes(id),
  oferta_id UUID NOT NULL,
  produto_id UUID NOT NULL,
  quantidade NUMERIC(18,3) NOT NULL CHECK (quantidade > 0),
  quantidade_devolvida NUMERIC(18,3) NOT NULL DEFAULT 0
    CHECK (quantidade_devolvida >= 0 AND quantidade_devolvida <= quantidade),
  valor_unitario_centavos BIGINT NOT NULL CHECK (valor_unitario_centavos >= 0),
  descricao_snapshot TEXT NOT NULL,
  unidade_snapshot TEXT NOT NULL,
  prazo_devolucao TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'solicitado'
    CHECK (status IN ('solicitado','aceito','expedido','recebido',
                     'devolucao_em_transito','concluido','recusado','cancelado')),
  versao INTEGER NOT NULL DEFAULT 1 CHECK (versao > 0),
  chave_idempotencia TEXT NOT NULL CHECK (length(chave_idempotencia) >= 8),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cedente_id <> tomadora_id),
  UNIQUE(tomadora_id, chave_idempotencia),
  FOREIGN KEY (oferta_id, cedente_id)
    REFERENCES public.rede_ofertas(id, organizacao_id),
  FOREIGN KEY (cedente_id, produto_id)
    REFERENCES public.rede_produtos(organizacao_id,id)
);
CREATE INDEX idx_rede_emp_cedente ON public.rede_emprestimos(cedente_id,criado_em DESC);
CREATE INDEX idx_rede_emp_tomadora ON public.rede_emprestimos(tomadora_id,criado_em DESC);

CREATE TABLE public.rede_custodia (
  emprestimo_id UUID PRIMARY KEY REFERENCES public.rede_emprestimos(id),
  tomadora_id UUID NOT NULL REFERENCES public.rede_organizacoes(id),
  quantidade_recebida NUMERIC(18,3) NOT NULL DEFAULT 0,
  quantidade_devolvida NUMERIC(18,3) NOT NULL DEFAULT 0,
  CHECK (quantidade_recebida >= 0 AND quantidade_devolvida >= 0
    AND quantidade_devolvida <= quantidade_recebida)
);

CREATE TABLE public.rede_devolucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprestimo_id UUID NOT NULL REFERENCES public.rede_emprestimos(id),
  quantidade NUMERIC(18,3) NOT NULL CHECK (quantidade > 0),
  status TEXT NOT NULL DEFAULT 'em_transito'
    CHECK (status IN ('em_transito','confirmada','divergente')),
  chave_idempotencia TEXT NOT NULL CHECK (length(chave_idempotencia) >= 8),
  solicitado_por UUID NOT NULL REFERENCES auth.users(id),
  confirmado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmado_em TIMESTAMPTZ,
  UNIQUE(emprestimo_id, chave_idempotencia)
);
CREATE INDEX idx_rede_devolucoes_loan ON public.rede_devolucoes(emprestimo_id,status);

CREATE TABLE public.rede_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.rede_organizacoes(id),
  produto_id UUID NOT NULL,
  emprestimo_id UUID NOT NULL REFERENCES public.rede_emprestimos(id),
  devolucao_id UUID REFERENCES public.rede_devolucoes(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('saida','entrada')),
  quantidade NUMERIC(18,3) NOT NULL CHECK (quantidade > 0),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (organizacao_id,produto_id)
    REFERENCES public.rede_produtos(organizacao_id,id),
  UNIQUE(emprestimo_id,devolucao_id,tipo)
);
-- PostgreSQL unique treats NULL as distinct: enforce one original dispatch.
CREATE UNIQUE INDEX uq_rede_saida_emprestimo
  ON public.rede_movimentos(emprestimo_id) WHERE tipo = 'saida';
CREATE UNIQUE INDEX uq_rede_entrada_devolucao
  ON public.rede_movimentos(devolucao_id) WHERE tipo = 'entrada';

CREATE TABLE public.rede_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprestimo_id UUID NOT NULL REFERENCES public.rede_emprestimos(id),
  organizacao_ator_id UUID NOT NULL REFERENCES public.rede_organizacoes(id),
  usuario_ator_id UUID NOT NULL REFERENCES auth.users(id),
  evento TEXT NOT NULL,
  versao INTEGER NOT NULL,
  detalhes_publicos JSONB NOT NULL DEFAULT '{}'::JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rede_eventos_emprestimo ON public.rede_eventos(emprestimo_id,criado_em);

-- Explicit grant revocation: no browser directly inserts/updates business
-- actions or stock. Authenticated may only SELECT, filtered by RLS.
DO $$
DECLARE item TEXT;
BEGIN
  FOREACH item IN ARRAY ARRAY[
    'rede_organizacoes','rede_membros','rede_parcerias','rede_produtos',
    'rede_ofertas','rede_emprestimos','rede_custodia','rede_devolucoes',
    'rede_movimentos','rede_eventos'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',item);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',item);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated',item);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION rede_private.has_membership(p_org UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.rede_membros
    WHERE organizacao_id = p_org AND usuario_id = (SELECT auth.uid()) AND ativo
  )
$$;

CREATE OR REPLACE FUNCTION rede_private.has_role(p_org UUID, p_roles TEXT[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.rede_membros
    WHERE organizacao_id = p_org AND usuario_id = (SELECT auth.uid())
      AND ativo AND papel = ANY(p_roles)
  )
$$;

CREATE OR REPLACE FUNCTION rede_private.is_partner(p_owner_org UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT rede_private.has_membership(p_owner_org)
     OR EXISTS (
       SELECT 1 FROM public.rede_parcerias p
       JOIN public.rede_membros m
         ON m.organizacao_id IN (p.solicitante_id,p.convidada_id)
          AND m.organizacao_id <> p_owner_org
          AND m.usuario_id = (SELECT auth.uid()) AND m.ativo
       WHERE p.status = 'ativa'
         AND p_owner_org IN (p.solicitante_id,p.convidada_id)
     )
$$;

-- Organization names/identity may be discovered for partnership requests,
-- but pending organizations and private team data remain hidden.
CREATE POLICY rede_organizacoes_visible ON public.rede_organizacoes
  FOR SELECT TO authenticated USING (
    rede_private.has_membership(id)
    OR (
      status='ativa'
      AND EXISTS (
        SELECT 1 FROM public.rede_membros m
        WHERE m.usuario_id=(SELECT auth.uid()) AND m.ativo
      )
    )
  );

CREATE POLICY rede_membros_visible ON public.rede_membros
  FOR SELECT TO authenticated USING (
    usuario_id = (SELECT auth.uid())
    OR rede_private.has_role(organizacao_id,ARRAY['proprietario','administrador'])
  );

CREATE POLICY rede_parcerias_visible ON public.rede_parcerias
  FOR SELECT TO authenticated USING (
    rede_private.has_membership(solicitante_id)
    OR rede_private.has_membership(convidada_id)
  );

CREATE POLICY rede_produtos_own_only ON public.rede_produtos
  FOR SELECT TO authenticated USING (rede_private.has_membership(organizacao_id));

CREATE POLICY rede_ofertas_partners_only ON public.rede_ofertas
  FOR SELECT TO authenticated USING (
    rede_private.is_partner(organizacao_id) AND ativa
    OR rede_private.has_membership(organizacao_id)
  );

CREATE POLICY rede_loans_bilateral ON public.rede_emprestimos
  FOR SELECT TO authenticated USING (
    rede_private.has_membership(cedente_id) OR rede_private.has_membership(tomadora_id)
  );

CREATE POLICY rede_custodia_borrower_only ON public.rede_custodia
  FOR SELECT TO authenticated USING (rede_private.has_membership(tomadora_id));

CREATE POLICY rede_returns_bilateral ON public.rede_devolucoes
  FOR SELECT TO authenticated USING (
    EXISTS(SELECT 1 FROM public.rede_emprestimos e
      WHERE e.id = emprestimo_id AND
      (rede_private.has_membership(e.cedente_id) OR
       rede_private.has_membership(e.tomadora_id)))
  );

CREATE POLICY rede_movements_owner_only ON public.rede_movimentos
  FOR SELECT TO authenticated USING (rede_private.has_membership(organizacao_id));

CREATE POLICY rede_events_bilateral ON public.rede_eventos
  FOR SELECT TO authenticated USING (
    EXISTS(SELECT 1 FROM public.rede_emprestimos e
      WHERE e.id = emprestimo_id AND
      (rede_private.has_membership(e.cedente_id) OR
       rede_private.has_membership(e.tomadora_id)))
  );

REVOKE ALL ON FUNCTION rede_private.has_membership(UUID) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION rede_private.has_role(UUID,TEXT[]) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION rede_private.is_partner(UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION rede_private.has_membership(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rede_private.has_role(UUID,TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION rede_private.is_partner(UUID) TO authenticated;
