-- Execute only with disposable CI database. ON_ERROR_STOP=1 is required.
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 ('11111111-1111-4111-8111-111111111111','a@example.invalid',now()),
 ('22222222-2222-4222-8222-222222222222','b@example.invalid',now()),
 ('33333333-3333-4333-8333-333333333333','c@example.invalid',now()),
 ('44444444-4444-4444-8444-444444444444','x@example.invalid',NULL);

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
DO $$
DECLARE denied BOOLEAN := false;
BEGIN
  BEGIN
    PERFORM public.rede_criar_organizacao('Unconfirmed','Unconfirmed','00000000000099');
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN
    RAISE EXCEPTION 'Unconfirmed email created a tenant';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SELECT public.rede_criar_organizacao('Loja A Ltda','Loja A','00000000000001');

SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
SELECT public.rede_criar_organizacao('Loja B Ltda','Loja B','00000000000002');

SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
SELECT public.rede_criar_organizacao('Loja C Ltda','Loja C','00000000000003');
RESET ROLE;

-- Administrative company verification (manual step in production).
UPDATE public.rede_organizacoes SET status='ativa'
WHERE cnpj IN ('00000000000001','00000000000002','00000000000003');

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
DO $
BEGIN
  IF EXISTS (SELECT 1 FROM public.rede_organizacoes) THEN
    RAISE EXCEPTION 'Authenticated outsider can browse business directory';
  END IF;
END $;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE a UUID; b UUID; created JSONB;
BEGIN
  SELECT id INTO a FROM public.rede_organizacoes WHERE cnpj='00000000000001';
  SELECT id INTO b FROM public.rede_organizacoes WHERE cnpj='00000000000002';
  created := public.rede_operar(a,'criar_produto',jsonb_build_object(
    'codigo','A-001','descricao','Argamassa privada',
    'unidade','UN','estoque',2,
    'custo_privado_centavos',730,'preco_venda_privado_centavos',1090));
  IF created->>'custo_privado_centavos' <> '730' THEN
    RAISE EXCEPTION 'Private catalog was not created';
  END IF;
  created := public.rede_operar(a,'publicar_oferta',jsonb_build_object(
    'produto_id',(created->>'id')::UUID,'preco_centavos',1200));
  IF created->>'descricao_publica' <> 'Argamassa privada' THEN
    RAISE EXCEPTION 'Network offer not published';
  END IF;
  created := public.rede_operar(a,'solicitar_parceria',
    jsonb_build_object('outra_organizacao_id',b));
  IF created->>'status' <> 'pendente' THEN
    RAISE EXCEPTION 'Partnership request not created';
  END IF;
END $$;

-- B cannot see A stock or private costs, even with a known product ID.
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
DECLARE a UUID; b UUID; pid UUID; created JSONB;
BEGIN
  SELECT id INTO a FROM public.rede_organizacoes WHERE cnpj='00000000000001';
  SELECT id INTO b FROM public.rede_organizacoes WHERE cnpj='00000000000002';
  SELECT id INTO pid FROM public.rede_parcerias WHERE solicitante_id=a AND convidada_id=b;
  IF (SELECT count(*) FROM public.rede_produtos WHERE organizacao_id=a) <> 0 THEN
    RAISE EXCEPTION 'B can read A private products';
  END IF;
  IF (SELECT count(*) FROM public.rede_ofertas WHERE organizacao_id=a) <> 0 THEN
    RAISE EXCEPTION 'B can read offers before partnership acceptance';
  END IF;
  created := public.rede_operar(b,'responder_parceria',
    jsonb_build_object('parceria_id',pid,'aceitar',true));
  IF created->>'status' <> 'ativa' THEN
    RAISE EXCEPTION 'Partner B did not accept';
  END IF;
  IF (SELECT count(*) FROM public.rede_ofertas WHERE organizacao_id=a) <> 1 THEN
    RAISE EXCEPTION 'B cannot read explicitly published partnered offer';
  END IF;
  IF (SELECT count(*) FROM public.rede_produtos WHERE organizacao_id=a) <> 0 THEN
    RAISE EXCEPTION 'Private product leaked after partnering';
  END IF;
END $$;

-- Tenant C sees neither A/B private catalog, offers nor contracts.
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
DO $$
DECLARE c UUID; a UUID; blocked BOOLEAN := false;
BEGIN
  SELECT id INTO c FROM public.rede_organizacoes WHERE cnpj='00000000000003';
  SELECT id INTO a FROM public.rede_organizacoes WHERE cnpj='00000000000001';
  IF EXISTS (SELECT 1 FROM public.rede_ofertas)
    OR EXISTS (SELECT 1 FROM public.rede_produtos)
    OR EXISTS (SELECT 1 FROM public.rede_emprestimos)
    OR EXISTS (SELECT 1 FROM public.rede_parcerias) THEN
    RAISE EXCEPTION 'C can read other tenant data';
  END IF;
  BEGIN
    PERFORM public.rede_operar(c,'publicar_oferta',
      jsonb_build_object('produto_id',(SELECT id FROM public.rede_ofertas LIMIT 1)));
  EXCEPTION WHEN insufficient_privilege THEN blocked := true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'C can act on A offer'; END IF;
END $$;

-- Borrower B creates the shared contract.
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
DECLARE b UUID; offer UUID; result JSONB; loan UUID; blocked BOOLEAN := false;
BEGIN
  SELECT id INTO b FROM public.rede_organizacoes WHERE cnpj='00000000000002';
  SELECT id INTO offer FROM public.rede_ofertas;
  result := public.rede_operar(b,'solicitar_emprestimo',jsonb_build_object(
    'oferta_id',offer,'quantidade',2,
    'prazo_devolucao',now()+interval '5 days',
    'idempotency_key','demo-request-0001'));
  loan := (result->>'id')::UUID;
  IF result->>'status' <> 'solicitado' THEN
    RAISE EXCEPTION 'Loan request not created';
  END IF;
  -- Duplicate with different payload must not mutate anything.
  BEGIN
    PERFORM public.rede_operar(b,'solicitar_emprestimo',jsonb_build_object(
      'oferta_id',offer,'quantidade',1,
      'prazo_devolucao',now()+interval '5 days',
      'idempotency_key','demo-request-0001'));
  EXCEPTION WHEN unique_violation THEN blocked := true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Duplicate conflicting request accepted'; END IF;
  blocked := false;
  BEGIN
    PERFORM public.rede_operar(b,'aceitar_emprestimo',
      jsonb_build_object('emprestimo_id',loan,'expected_version',1));
  EXCEPTION WHEN insufficient_privilege THEN blocked := true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Borrower can accept lender action'; END IF;
END $$;

-- Lender A reserves and dispatches; both are separate atomic steps.
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE a UUID; loan UUID; result JSONB;
BEGIN
  SELECT id INTO a FROM public.rede_organizacoes WHERE cnpj='00000000000001';
  SELECT id INTO loan FROM public.rede_emprestimos WHERE chave_idempotencia='demo-request-0001';
  result := public.rede_operar(a,'aceitar_emprestimo',
    jsonb_build_object('emprestimo_id',loan,'expected_version',1));
  IF result->>'status' <> 'aceito' OR (result->>'versao')::INTEGER <> 2 THEN
    RAISE EXCEPTION 'Loan not reserved and accepted';
  END IF;
  IF (SELECT reservado FROM public.rede_produtos WHERE codigo='A-001') <> 2 THEN
    RAISE EXCEPTION 'Lender stock not reserved';
  END IF;
  result := public.rede_operar(a,'expedir_emprestimo',
    jsonb_build_object('emprestimo_id',loan,'expected_version',2));
  IF result->>'status' <> 'expedido' THEN
    RAISE EXCEPTION 'Loan was not dispatched';
  END IF;
  IF (SELECT estoque FROM public.rede_produtos WHERE codigo='A-001') <> 0
    OR (SELECT reservado FROM public.rede_produtos WHERE codigo='A-001') <> 0 THEN
    RAISE EXCEPTION 'Dispatch did not debit lender inventory';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
DECLARE b UUID; loan UUID; result JSONB;
BEGIN
  SELECT id INTO b FROM public.rede_organizacoes WHERE cnpj='00000000000002';
  SELECT id INTO loan FROM public.rede_emprestimos WHERE chave_idempotencia='demo-request-0001';
  result := public.rede_operar(b,'confirmar_recebimento',
    jsonb_build_object('emprestimo_id',loan,'expected_version',3));
  IF result->>'status' <> 'recebido' THEN
    RAISE EXCEPTION 'Borrower did not confirm custody';
  END IF;
  IF (SELECT quantidade_recebida FROM public.rede_custodia
      WHERE emprestimo_id=loan) <> 2 THEN
    RAISE EXCEPTION 'Third-party custody not created';
  END IF;
  result := public.rede_operar(b,'enviar_devolucao',
    jsonb_build_object('emprestimo_id',loan,'expected_version',4,
    'quantidade',2,'idempotency_key','return-demo-0001'));
  IF result->>'status' <> 'em_transito' THEN
    RAISE EXCEPTION 'Return was not shipped';
  END IF;
  -- Retry is idempotent while return is pending; no second return.
  result := public.rede_operar(b,'enviar_devolucao',
    jsonb_build_object('emprestimo_id',loan,'expected_version',5,
    'quantidade',2,'idempotency_key','return-demo-0001'));
  IF (SELECT count(*) FROM public.rede_devolucoes WHERE emprestimo_id=loan) <> 1 THEN
    RAISE EXCEPTION 'Duplicate return registered';
  END IF;
END $$;

-- Stock MUST remain zero while returned goods are still in transit.
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE a UUID; loan UUID; ret UUID; result JSONB; blocked BOOLEAN := false;
BEGIN
  SELECT id INTO a FROM public.rede_organizacoes WHERE cnpj='00000000000001';
  SELECT id INTO loan FROM public.rede_emprestimos WHERE chave_idempotencia='demo-request-0001';
  SELECT id INTO ret FROM public.rede_devolucoes WHERE emprestimo_id=loan;
  IF (SELECT estoque FROM public.rede_produtos WHERE codigo='A-001') <> 0 THEN
    RAISE EXCEPTION 'Unconfirmed return credited saleable inventory';
  END IF;
  result := public.rede_operar(a,'confirmar_devolucao',
    jsonb_build_object('devolucao_id',ret,'expected_version',5));
  IF result->>'status' <> 'concluido'
    OR (result->>'quantidade_devolvida')::NUMERIC <> 2 THEN
    RAISE EXCEPTION 'Return was not fully settled';
  END IF;
  IF (SELECT estoque FROM public.rede_produtos WHERE codigo='A-001') <> 2 THEN
    RAISE EXCEPTION 'Confirmed physical return not credited';
  END IF;
  BEGIN
    PERFORM public.rede_operar(a,'confirmar_devolucao',
      jsonb_build_object('devolucao_id',ret,'expected_version',6));
  EXCEPTION WHEN insufficient_privilege THEN blocked := true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Double confirmation accepted'; END IF;
END $$;
RESET ROLE;

-- Compare events, ledgers, and prove no privilege leak in metadata.
DO $$
BEGIN
  IF (SELECT count(*) FROM public.rede_movimentos) <> 2
    OR (SELECT count(*) FROM public.rede_eventos) <> 6
    OR (SELECT count(*) FROM public.rede_emprestimos) <> 1
    OR (SELECT count(*) FROM public.rede_devolucoes) <> 1 THEN
    RAISE EXCEPTION 'Transaction / audit / stock ledger mismatch';
  END IF;
  IF EXISTS(
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema='public' AND table_name LIKE 'rede_%'
      AND grantee='anon' AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
  ) THEN
    RAISE EXCEPTION 'Network data is exposed to anon';
  END IF;
  IF EXISTS(
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema='public' AND table_name LIKE 'rede_%'
      AND grantee='authenticated'
      AND privilege_type IN ('INSERT','UPDATE','DELETE')
  ) THEN
    RAISE EXCEPTION 'Client can bypass transaction functions';
  END IF;
  RAISE NOTICE 'MODEL B PASS: confirmed org, partner-only offers, A/B/C RLS, bilateral stock and custody';
END $$;
