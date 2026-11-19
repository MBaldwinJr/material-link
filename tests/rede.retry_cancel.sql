-- Run after the Model B A/B/C smoke test, against CI disposable PostgreSQL.
-- Verify physical stock, reservation release, and idempotent replay following closure.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
DECLARE v_b UUID; v_offer UUID; v_loan JSONB; v_retry JSONB;
BEGIN
  SELECT id INTO v_b FROM public.rede_organizacoes WHERE cnpj='00000000000002';
  SELECT id INTO v_offer FROM public.rede_ofertas WHERE descricao_publica='Argamassa privada';

  -- Initial loan is already closed in rede.postgres.smoke.sql.
  SELECT to_jsonb(d) INTO v_loan FROM public.rede_devolucoes d
    WHERE d.chave_idempotencia='return-demo-0001';

  -- A caller that did not get the original response retries with exactly
  -- the OLD version. It must receive the same return without a new movement.
  SELECT public.rede_operar(v_b,'enviar_devolucao',jsonb_build_object(
    'emprestimo_id',v_loan->>'emprestimo_id',
    'expected_version',4,'quantidade',2,
    'idempotency_key','return-demo-0001')) INTO v_retry;
  IF v_retry->>'id' <> v_loan->>'id'
     OR v_retry->>'status' <> 'confirmada' THEN
    RAISE EXCEPTION 'Closed return replay did not return original operation';
  END IF;

  -- Create separate, new loan to test cancelling an accepted reservation.
  PERFORM public.rede_operar(v_b,'solicitar_emprestimo',jsonb_build_object(
    'oferta_id',v_offer,'quantidade',2,
    'prazo_devolucao',now()+interval '9 days',
    'idempotency_key','cancel-test-00001'));
END $$;

SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE v_a UUID; v_loan UUID; v_result JSONB; v_prod UUID;
BEGIN
  SELECT id INTO v_a FROM public.rede_organizacoes WHERE cnpj='00000000000001';
  SELECT id INTO v_loan FROM public.rede_emprestimos
    WHERE chave_idempotencia='cancel-test-00001';
  SELECT produto_id INTO v_prod FROM public.rede_emprestimos WHERE id=v_loan;
  v_result := public.rede_operar(v_a,'aceitar_emprestimo',jsonb_build_object(
    'emprestimo_id',v_loan,'expected_version',1));
  IF v_result->>'status' <> 'aceito'
     OR (SELECT reservado FROM public.rede_produtos WHERE id=v_prod) <> 2 THEN
    RAISE EXCEPTION 'Accepted loan did not reserve stock';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
DECLARE v_b UUID; v_loan UUID; v_result JSONB; v_prod UUID;
BEGIN
  SELECT id INTO v_b FROM public.rede_organizacoes WHERE cnpj='00000000000002';
  SELECT id INTO v_loan FROM public.rede_emprestimos
    WHERE chave_idempotencia='cancel-test-00001';
  SELECT produto_id INTO v_prod FROM public.rede_emprestimos WHERE id=v_loan;
  v_result := public.rede_operar(v_b,'cancelar_reserva',jsonb_build_object(
    'emprestimo_id',v_loan,'expected_version',2));
  IF v_result->>'status' <> 'cancelado'
     OR (SELECT reservado FROM public.rede_produtos WHERE id=v_prod) <> 0
     OR (SELECT estoque FROM public.rede_produtos WHERE id=v_prod) <> 2 THEN
    RAISE EXCEPTION 'Cancelled reservation did not restore available stock';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE v_a UUID; v_loan UUID; denied BOOLEAN := false;
BEGIN
  SELECT id INTO v_a FROM public.rede_organizacoes WHERE cnpj='00000000000001';
  SELECT id INTO v_loan FROM public.rede_emprestimos
    WHERE chave_idempotencia='cancel-test-00001';
  BEGIN
    PERFORM public.rede_operar(v_a,'expedir_emprestimo',jsonb_build_object(
      'emprestimo_id',v_loan,'expected_version',3));
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN
    RAISE EXCEPTION 'Dispatch after accepted reservation was cancelled';
  END IF;
END $$;
RESET ROLE;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.rede_movimentos) <> 2
     OR (SELECT count(*) FROM public.rede_devolucoes) <> 1 THEN
    RAISE EXCEPTION 'Replay or cancellation duplicated inventory movement';
  END IF;
  RAISE NOTICE 'MODEL B PASS: stale-version idempotency and pre-dispatch reservation cancellation';
END $$;
