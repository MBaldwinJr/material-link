-- Model B: authorized inventory adjustment separated from loan/return movements.
CREATE TABLE public.rede_ajustes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.rede_organizacoes(id),
  produto_id UUID NOT NULL,
  diferenca NUMERIC(18,3) NOT NULL CHECK(diferenca <> 0),
  saldo_anterior NUMERIC(18,3) NOT NULL,
  saldo_posterior NUMERIC(18,3) NOT NULL,
  motivo TEXT NOT NULL CHECK (length(btrim(motivo)) >= 5),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (organizacao_id,produto_id)
    REFERENCES public.rede_produtos(organizacao_id,id)
);
ALTER TABLE public.rede_ajustes_estoque ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rede_ajustes_estoque FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.rede_ajustes_estoque TO authenticated;
CREATE POLICY rede_ajuste_private ON public.rede_ajustes_estoque
  FOR SELECT TO authenticated USING(rede_private.has_membership(organizacao_id));

CREATE OR REPLACE FUNCTION rede_private.ajustar_estoque(
  p_organizacao_id UUID,p_produto_id UUID,p_diferenca NUMERIC,p_motivo TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user UUID := (SELECT auth.uid());
  v_prod public.rede_produtos%ROWTYPE;
  v_novo NUMERIC(18,3);
BEGIN
  IF v_user IS NULL OR NOT rede_private.has_role(p_organizacao_id,
    ARRAY['proprietario','administrador','estoque']) THEN
    RAISE EXCEPTION 'Sem permissão de ajuste de estoque' USING ERRCODE='42501';
  END IF;
  IF (SELECT status FROM public.rede_organizacoes
      WHERE id=p_organizacao_id) <> 'ativa' THEN
    RAISE EXCEPTION 'Organização não ativa' USING ERRCODE='42501';
  END IF;
  IF p_diferenca IS NULL OR p_diferenca=0 OR
     length(btrim(COALESCE(p_motivo,'')))<5 THEN
    RAISE EXCEPTION 'Ajuste exige diferença e motivo' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_prod FROM public.rede_produtos
    WHERE organizacao_id=p_organizacao_id AND id=p_produto_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto de outra organização ou inexistente'
      USING ERRCODE='42501';
  END IF;
  v_novo := v_prod.estoque+p_diferenca;
  IF v_novo < 0 OR v_novo < v_prod.reservado THEN
    RAISE EXCEPTION 'Ajuste compromete estoque reservado ou saldo disponível'
      USING ERRCODE='23514';
  END IF;
  UPDATE public.rede_produtos SET estoque=v_novo WHERE id=v_prod.id;
  INSERT INTO public.rede_ajustes_estoque(
    organizacao_id,produto_id,diferenca,saldo_anterior,saldo_posterior,
    motivo,usuario_id
  ) VALUES(
    p_organizacao_id,v_prod.id,p_diferenca,v_prod.estoque,
    v_novo,btrim(p_motivo),v_user
  );
  RETURN jsonb_build_object('produto_id',v_prod.id,
    'estoque_anterior',v_prod.estoque,'estoque_atual',v_novo);
END $$;

CREATE OR REPLACE FUNCTION public.rede_ajustar_estoque(
  p_organizacao_id UUID,p_produto_id UUID,p_diferenca NUMERIC,p_motivo TEXT
) RETURNS JSONB LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT rede_private.ajustar_estoque(
  p_organizacao_id,p_produto_id,p_diferenca,p_motivo
) $$;

REVOKE ALL ON FUNCTION rede_private.ajustar_estoque(UUID,UUID,NUMERIC,TEXT)
  FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.rede_ajustar_estoque(UUID,UUID,NUMERIC,TEXT)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION rede_private.ajustar_estoque(UUID,UUID,NUMERIC,TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rede_ajustar_estoque(UUID,UUID,NUMERIC,TEXT)
  TO authenticated;
