-- Model B: records exact mapping and reconciliation of the historical ERP
-- catalog. Does not copy data or assign ownership automatically.
CREATE TABLE public.rede_importacoes_produtos (
  organizacao_id UUID NOT NULL REFERENCES public.rede_organizacoes(id),
  legacy_produto_id UUID NOT NULL,
  novo_produto_id UUID NOT NULL REFERENCES public.rede_produtos(id),
  saldo_legado NUMERIC NOT NULL,
  saldo_importado NUMERIC(18,3) NOT NULL,
  necessita_conciliacao BOOLEAN NOT NULL DEFAULT false,
  importado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(organizacao_id,legacy_produto_id),
  UNIQUE(organizacao_id,novo_produto_id)
);
ALTER TABLE public.rede_importacoes_produtos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rede_importacoes_produtos FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.rede_importacoes_produtos TO authenticated;
CREATE POLICY rede_importacoes_restritas ON public.rede_importacoes_produtos
  FOR SELECT TO authenticated USING (
    rede_private.has_role(organizacao_id,
      ARRAY['proprietario','administrador','estoque'])
  );
