-- Run ONLY in the disposable Postgres container after historical migrations.
-- Assertions throw on violations and make GitHub Actions fail.

INSERT INTO auth.users(id,email) VALUES
 ('11111111-1111-4111-8111-111111111111','p0-admin@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','p0-reader@example.invalid'),
 ('33333333-3333-4333-8333-333333333333','p0-unauthorized@example.invalid');

INSERT INTO public.inter_mat_operadores(usuario_id,papel) VALUES
 ('11111111-1111-4111-8111-111111111111','admin'),
 ('22222222-2222-4222-8222-222222222222','consulta');

INSERT INTO public.empresas(id,razao_social,nome_fantasia,cnpj,limite_centavos)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Teste P0','Teste P0','00000000000001',0);
INSERT INTO public.produtos(id,codigo,descricao,unidade,estoque_atual)
VALUES
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','P0-1','Teste de saldo','UN',2),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','P0-NEG','Legado negativo','UN',-28);

-- Existing historical negative stock must not block metadata updates.
UPDATE public.produtos SET descricao='Negativo preexistente' WHERE codigo='P0-NEG';

-- Deny public data even when data is present (read-only proof in SQL contract).
\i tests/p0.security.sql

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);

DO $$
DECLARE
  v_denied boolean := false;
BEGIN
  IF EXISTS (SELECT 1 FROM public.empresas) THEN
    RAISE EXCEPTION 'Unauthorized authenticated user read company data';
  END IF;
  BEGIN
    PERFORM public.registrar_emprestimo_seguro(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      1, 100, now(), now()+interval '7 days', 'Teste','', '', ''
    );
  EXCEPTION WHEN insufficient_privilege THEN v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'Unauthorized user created loan'; END IF;
END $$;

-- Reader may query the catalog, but may not create loans or mutate products.
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
DECLARE v_denied boolean := false;
BEGIN
  IF (SELECT count(*) FROM public.produtos) <> 2 THEN
    RAISE EXCEPTION 'Reader cannot see catalog';
  END IF;
  BEGIN
    PERFORM public.registrar_emprestimo_seguro(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      1, 100, now(), now()+interval '7 days', 'Teste','', '', ''
    );
  EXCEPTION WHEN insufficient_privilege THEN v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'Read-only user could create loan'; END IF;
END $$;

-- Authorized administrator: atomic stock movement and auditable returns.
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE
  loan public.emprestimos;
  returned public.devolucoes;
  rejected boolean;
BEGIN
  SELECT * INTO loan FROM public.registrar_emprestimo_seguro(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    2, 100, now(), now()+interval '7 days','P0 admin','','',''
  );
  IF loan.id IS NULL OR (SELECT estoque_atual FROM public.produtos WHERE codigo='P0-1') <> 0 THEN
    RAISE EXCEPTION 'Loan was not atomically booked';
  END IF;

  rejected := false;
  BEGIN
    PERFORM public.registrar_emprestimo_seguro(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      1, 100, now(), now()+interval '7 days','P0 admin','','',''
    );
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Insufficient-stock loan was not denied'; END IF;

  -- Negative legacy balances must also be ineligible for lending.
  rejected := false;
  BEGIN
    PERFORM public.registrar_emprestimo_seguro(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      1, 100, now(), now()+interval '7 days','P0 admin','','',''
    );
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Negative-stock item was lent'; END IF;

  SELECT * INTO returned FROM public.registrar_devolucao_segura(
    loan.id,'total',2,'P0 admin',''
  );
  IF returned.id IS NULL THEN RAISE EXCEPTION 'Return was not created'; END IF;
  IF (SELECT estoque_atual FROM public.produtos WHERE codigo='P0-1') <> 2 THEN
    RAISE EXCEPTION 'Return inventory was not restored';
  END IF;
  IF (SELECT status FROM public.emprestimos WHERE id=loan.id) <> 'devolvido' THEN
    RAISE EXCEPTION 'Loan status was not settled';
  END IF;

  rejected := false;
  BEGIN
    PERFORM public.registrar_devolucao_segura(loan.id,'total',1,'P0 admin','');
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Duplicate return was accepted'; END IF;

  IF (SELECT count(*) FROM public.movimentacoes_estoque WHERE origem=loan.numero) <> 2 THEN
    RAISE EXCEPTION 'Loan or return stock movement missing';
  END IF;
  IF (SELECT count(*) FROM public.auditoria WHERE entidade=loan.numero) <> 2 THEN
    RAISE EXCEPTION 'Loan or return audit missing';
  END IF;
END $$;

RESET ROLE;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.emprestimos WHERE numero LIKE 'EMP-%') <> 1 THEN
    RAISE EXCEPTION 'Unexpected extra loan after failed operations';
  END IF;
  RAISE NOTICE 'P0 PASS: role isolation, transaction integrity, inventory and audit';
END $$;
