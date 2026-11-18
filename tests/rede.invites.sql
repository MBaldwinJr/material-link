-- Disposable CI only, run after A/B/C smoke and before concurrency.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);

-- Generate invitation token once; only its SHA256 persists in the database.
SELECT (public.rede_convidar_membro(
  (SELECT id FROM public.rede_organizacoes WHERE cnpj='00000000000001'),
  'x@example.invalid','consulta')->>'token') AS invite_token
\gset
SELECT set_config('model_b.invite_token',:'invite_token',false);

-- B's confirmed email is not X's; cannot consume X's invitation.
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
DECLARE denied BOOLEAN := false;
BEGIN
  BEGIN
    PERFORM public.rede_aceitar_convite(current_setting('model_b.invite_token'));
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Wrong email accepted organization invitation'; END IF;
END $$;

-- X has the matching email, but email confirmation is still mandatory.
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
DO $$
DECLARE denied BOOLEAN := false;
BEGIN
  BEGIN
    PERFORM public.rede_aceitar_convite(current_setting('model_b.invite_token'));
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Unconfirmed identity accepted invitation'; END IF;
END $$;
RESET ROLE;
UPDATE auth.users SET email_confirmed_at=now()
  WHERE id='44444444-4444-4444-8444-444444444444';

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
DO $$
DECLARE
  invited JSONB; a UUID; denied BOOLEAN := false;
BEGIN
  SELECT id INTO a FROM public.rede_organizacoes WHERE cnpj='00000000000001';
  invited := public.rede_aceitar_convite(current_setting('model_b.invite_token'));
  IF invited->>'organizacao_id' <> a::TEXT OR invited->>'papel' <> 'consulta' THEN
    RAISE EXCEPTION 'Invitation membership was not provisioned';
  END IF;
  IF (SELECT count(*) FROM public.rede_produtos WHERE organizacao_id=a) <> 1 THEN
    RAISE EXCEPTION 'New member cannot consult own organization catalog';
  END IF;
  BEGIN
    PERFORM public.rede_operar(a,'criar_produto',jsonb_build_object(
      'codigo','NOT-ALLOWED','descricao','Invalid','estoque',1));
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Read-only invite escalated into stock writes'; END IF;

  denied := false;
  BEGIN
    PERFORM public.rede_aceitar_convite(current_setting('model_b.invite_token'));
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Invitation could be reused'; END IF;
END $$;
RESET ROLE;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.rede_membros WHERE usuario_id=
      '44444444-4444-4444-8444-444444444444' AND ativo) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one invited membership';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema='public' AND table_name='rede_convites'
      AND grantee='authenticated' AND privilege_type IN ('INSERT','UPDATE','DELETE')) THEN
    RAISE EXCEPTION 'Invitations writable directly by untrusted clients';
  END IF;
  RAISE NOTICE 'MODEL B PASS: invite verified email, one-use token and read-only role';
END $$;
