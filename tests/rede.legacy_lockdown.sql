-- Checks cutover guard without deleting legacy records.
DO $$
DECLARE legacy_table TEXT;
BEGIN
  FOREACH legacy_table IN ARRAY ARRAY[
    'empresas','produtos','emprestimos','devolucoes',
    'movimentacoes_estoque','auditoria','motoristas','veiculos'
  ] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class
      WHERE oid=format('public.%I',legacy_table)::regclass) THEN
      RAISE EXCEPTION 'Legacy RLS disabled: %',legacy_table;
    END IF;
    IF EXISTS(SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=legacy_table) THEN
      RAISE EXCEPTION 'Legacy public policy survived: %',legacy_table;
    END IF;
    IF has_table_privilege('anon',
      format('public.%I',legacy_table),'SELECT')
      OR has_table_privilege('authenticated',
        format('public.%I',legacy_table),'SELECT')
      OR has_table_privilege('anon',
        format('public.%I',legacy_table),'INSERT')
      OR has_table_privilege('authenticated',
        format('public.%I',legacy_table),'UPDATE') THEN
      RAISE EXCEPTION 'Legacy table still reachable by API roles: %',legacy_table;
    END IF;
    IF NOT has_table_privilege('service_role',
        format('public.%I',legacy_table),'SELECT') THEN
      RAISE EXCEPTION 'Trusted administrative access lost: %',legacy_table;
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM public.motoristas) <> 2
    OR (SELECT count(*) FROM public.veiculos) <> 2 THEN
    RAISE EXCEPTION 'Legacy demonstration data were deleted';
  END IF;
  RAISE NOTICE 'MODEL B PASS: legacy rows preserved, anonymous and authenticated grants revoked';
END $$;
