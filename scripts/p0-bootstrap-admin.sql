-- P0: first administrator bootstrap, for a trusted SQL connection with psql.
-- Requires the P0 migration to have been applied, and a CONFIRMED auth user.
-- Usage:
--   psql "$INTERMAT_DB_URL" -X -v ON_ERROR_STOP=1 \
--     -v ADMIN_EMAIL='owner@example.com' -f scripts/p0-bootstrap-admin.sql
-- Never use this command on a database with an unverified target identity.
\if :{?ADMIN_EMAIL}
\else
\echo ERROR: supply -v ADMIN_EMAIL=owner@example.com
\quit 3
\endif

BEGIN;
SELECT set_config('intermat.bootstrap_admin_email', lower(btrim(:'ADMIN_EMAIL')), true);

DO $$
DECLARE
  target_email text := current_setting('intermat.bootstrap_admin_email');
  matched integer;
  target_id uuid;
BEGIN
  IF target_email = '' OR target_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' THEN
    RAISE EXCEPTION 'Invalid administrator email' USING ERRCODE = '22023';
  END IF;

  SELECT count(*), max(id) INTO matched, target_id
  FROM auth.users
  WHERE lower(email) = target_email AND email_confirmed_at IS NOT NULL;

  IF matched <> 1 THEN
    RAISE EXCEPTION 'No exactly matching confirmed Auth user for the requested administrator'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.inter_mat_operadores
    WHERE papel = 'admin' AND ativo AND usuario_id <> target_id
  ) THEN
    RAISE EXCEPTION 'An active administrator already exists; use a separate reviewed access-management process'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.inter_mat_operadores (usuario_id, papel, ativo)
  VALUES (target_id, 'admin', true)
  ON CONFLICT (usuario_id)
  DO UPDATE SET papel = EXCLUDED.papel, ativo = true;
END $$;

SELECT u.email, o.papel, o.ativo
FROM public.inter_mat_operadores o
JOIN auth.users u ON u.id = o.usuario_id
WHERE lower(u.email) = current_setting('intermat.bootstrap_admin_email');
COMMIT;
