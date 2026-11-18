DO $$
DECLARE a UUID;
BEGIN
  SELECT id INTO a FROM public.rede_organizacoes WHERE cnpj='00000000000001';
  IF (SELECT count(*) FROM public.rede_importacoes_produtos
      WHERE organizacao_id=a) <> 2 THEN
    RAISE EXCEPTION 'Legacy import must map every original item';
  END IF;
  IF (SELECT count(*) FROM public.rede_importacoes_produtos
      WHERE organizacao_id=a AND necessita_conciliacao) <> 1 THEN
    RAISE EXCEPTION 'Negative inventory discrepancies not preserved';
  END IF;
  IF (SELECT estoque FROM public.rede_produtos
      WHERE organizacao_id=a AND codigo='LEGACY-NEG') <> 0 THEN
    RAISE EXCEPTION 'Negative legacy stock was made available for lending';
  END IF;
  IF (SELECT estoque_atual FROM public.produtos
      WHERE codigo='LEGACY-NEG') <> -3 THEN
    RAISE EXCEPTION 'Original negative stock record was overwritten';
  END IF;
  IF (SELECT estoque FROM public.rede_produtos
      WHERE organizacao_id=a AND codigo='LEGACY-1') <> 5 THEN
    RAISE EXCEPTION 'Positive legacy stock not transferred';
  END IF;
  RAISE NOTICE 'MODEL B PASS: identity verification, mapping, negative-stock quarantine, source preserved';
END $$;
