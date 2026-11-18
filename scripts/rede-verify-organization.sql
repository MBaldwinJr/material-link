-- Administrator-only verified company activation (external identity check).
-- Never activate a CNPJ merely because a user typed it into signup.
-- Verify business ownership externally BEFORE running:
--   psql "$MATERIAL_LINK_DB_URL" -X -v ON_ERROR_STOP=1 \
--      -v CNPJ='12345678000199' \
--      -v CONFIRMED_OWNER_EMAIL='owner@example.com' \
--      -f scripts/rede-verify-organization.sql
\if :{?CNPJ}
\else
\echo ERROR: must pass -v CNPJ=...
\quit 3
\endif
\if :{?CONFIRMED_OWNER_EMAIL}
\else
\echo ERROR: must pass -v CONFIRMED_OWNER_EMAIL=...
\quit 3
\endif

BEGIN;
SELECT set_config('model_b.verify_cnpj',:'CNPJ',true);
SELECT set_config('model_b.verify_email',lower(btrim(:'CONFIRMED_OWNER_EMAIL')),true);
DO $$
DECLARE
  v_org UUID;
  v_email TEXT := current_setting('model_b.verify_email');
  v_cnpj TEXT := current_setting('model_b.verify_cnpj');
BEGIN
  IF v_cnpj !~ '^[0-9]{14}$' OR v_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' THEN
    RAISE EXCEPTION 'Verification parameters invalid' USING ERRCODE='22023';
  END IF;
  SELECT id INTO v_org FROM public.rede_organizacoes
    WHERE cnpj=v_cnpj AND status IN ('pendente','ativa')
    FOR UPDATE;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Organization not found or already blocked/suspended';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.rede_membros m
    JOIN auth.users u ON u.id=m.usuario_id
    WHERE m.organizacao_id=v_org AND m.papel='proprietario' AND m.ativo
      AND lower(u.email)=v_email AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Email does not match the confirmed organization proprietor';
  END IF;
  UPDATE public.rede_organizacoes SET status='ativa' WHERE id=v_org;
  RAISE NOTICE 'Organization CNPJ % activated with confirmed owner %',
    v_cnpj,v_email;
END $$;
COMMIT;
