-- Trusted SQL admin connection only. DO NOT run without verified ownership.
-- Usage: psql "$MATERIAL_LINK_DB_URL" -X -v ON_ERROR_STOP=1 \
--   -v OWNER_CNPJ='12345678000199' -f scripts/rede-import-legacy-products.sql
-- Maintains legacy rows and records any negative balances for reconciliation.
\if :{?OWNER_CNPJ}
\else
\echo ERROR: OWNER_CNPJ must identify the human-verified owner of the legacy ERP catalog.
\quit 3
\endif

BEGIN;
SELECT set_config('model_b.legacy_owner_cnpj',:'OWNER_CNPJ',true);
DO $$
DECLARE
  v_org UUID;
  v_legacy BIGINT;
  v_mapped BIGINT;
BEGIN
  SELECT id INTO v_org FROM public.rede_organizacoes
    WHERE cnpj=current_setting('model_b.legacy_owner_cnpj')
      AND status='ativa';
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Owner organization must exist and be verified';
  END IF;
  IF EXISTS (SELECT 1 FROM public.rede_importacoes_produtos
      WHERE organizacao_id=v_org) THEN
    RAISE EXCEPTION 'Legacy catalog was already imported for this organization';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.rede_produtos np
    JOIN public.produtos p ON p.codigo=np.codigo
    WHERE np.organizacao_id=v_org
  ) THEN
    RAISE EXCEPTION 'Catalog conflicts with existing organization products; reconcile SKUs first';
  END IF;
  IF EXISTS (SELECT 1 FROM public.produtos
    WHERE custo_centavos < 0 OR venda_centavos < 0
       OR estoque_atual IS NULL) THEN
    RAISE EXCEPTION 'Legacy catalog contains unsupported prices/stock; review first';
  END IF;

  SELECT count(*) INTO v_legacy FROM public.produtos;
  INSERT INTO public.rede_produtos(
    organizacao_id,codigo,descricao,unidade,
    custo_privado_centavos,preco_venda_privado_centavos,estoque
  ) SELECT
    v_org,p.codigo,p.descricao,
    COALESCE(nullif(btrim(p.unidade),''),'UN'),
    p.custo_centavos,p.venda_centavos,GREATEST(p.estoque_atual,0)
  FROM public.produtos p;

  INSERT INTO public.rede_importacoes_produtos(
    organizacao_id,legacy_produto_id,novo_produto_id,
    saldo_legado,saldo_importado,necessita_conciliacao
  ) SELECT
    v_org,p.id,np.id,p.estoque_atual,
    np.estoque,p.estoque_atual < 0
  FROM public.produtos p
  JOIN public.rede_produtos np
    ON np.organizacao_id=v_org AND np.codigo=p.codigo;

  SELECT count(*) INTO v_mapped FROM public.rede_importacoes_produtos
    WHERE organizacao_id=v_org;
  IF v_legacy <> v_mapped THEN
    RAISE EXCEPTION 'Import mapping mismatch: source %, mapping %',
      v_legacy,v_mapped;
  END IF;
  RAISE NOTICE 'Imported % legacy products into verified org %, negative stock flagged',
    v_mapped,v_org;
END $$;

SELECT
  count(*) AS produtos_mapeados,
  count(*) FILTER (WHERE necessita_conciliacao) AS pendencias_estoque_negativo,
  sum(saldo_legado) AS saldo_total_original,
  sum(saldo_importado) AS saldo_total_disponivel_importado
FROM public.rede_importacoes_produtos
WHERE organizacao_id=(
  SELECT id FROM public.rede_organizacoes
  WHERE cnpj=current_setting('model_b.legacy_owner_cnpj')
);
COMMIT;
