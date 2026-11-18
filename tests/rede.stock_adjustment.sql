SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE
  a UUID; prod UUID; result JSONB; denied BOOLEAN := false;
BEGIN
  SELECT id INTO a FROM public.rede_organizacoes WHERE cnpj='00000000000001';
  SELECT id INTO prod FROM public.rede_produtos
    WHERE organizacao_id=a AND codigo='A-001';
  result := public.rede_ajustar_estoque(a,prod,-1,'Conferência física');
  IF (result->>'estoque_atual')::NUMERIC <> 1 THEN
    RAISE EXCEPTION 'Stock adjustment did not debit one unit';
  END IF;
  result := public.rede_ajustar_estoque(a,prod,1,'Reposição confirmada');
  IF (result->>'estoque_atual')::NUMERIC <> 2 THEN
    RAISE EXCEPTION 'Stock adjustment did not restore a unit';
  END IF;
  BEGIN
    PERFORM public.rede_ajustar_estoque(a,prod,-99,'Tentativa inválida');
  EXCEPTION WHEN check_violation THEN denied := true; END;
  IF NOT denied THEN
    RAISE EXCEPTION 'Invalid negative adjustment accepted';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
DO $$
DECLARE a UUID; prod UUID; denied BOOLEAN := false;
BEGIN
  SELECT id INTO a FROM public.rede_organizacoes WHERE cnpj='00000000000001';
  SELECT id INTO prod FROM public.rede_produtos
    WHERE organizacao_id=a AND codigo='A-001';
  BEGIN
    PERFORM public.rede_ajustar_estoque(a,prod,1,'Leitor não pode');
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Consultation user altered inventory'; END IF;
END $$;
RESET ROLE;
DO $$
DECLARE a UUID;
BEGIN
  SELECT id INTO a FROM public.rede_organizacoes WHERE cnpj='00000000000001';
  IF (SELECT count(*) FROM public.rede_ajustes_estoque
      WHERE organizacao_id=a) <> 2 THEN
    RAISE EXCEPTION 'Stock audit does not contain both adjustments';
  END IF;
  IF (SELECT estoque FROM public.rede_produtos
      WHERE organizacao_id=a AND codigo='A-001') <> 2 THEN
    RAISE EXCEPTION 'Inventory differs after compensating adjustments';
  END IF;
  RAISE NOTICE 'MODEL B PASS: audited inventory correction and prohibited role/negative adjustments';
END $$;
