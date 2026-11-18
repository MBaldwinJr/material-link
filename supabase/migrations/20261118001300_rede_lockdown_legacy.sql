-- Model B cutover guard: close the public legacy ERP API.
-- Does not DROP or overwrite a single legacy row.
-- MUST be deployed together with the new /rede frontend and network migrations.
-- The old single-company UI intentionally ceases to function.
DO $$
DECLARE
  legacy_table TEXT;
  legacy_policy RECORD;
BEGIN
  FOREACH legacy_table IN ARRAY ARRAY[
    'empresas','produtos','emprestimos','devolucoes',
    'movimentacoes_estoque','auditoria','motoristas','veiculos'
  ] LOOP
    IF to_regclass(format('public.%I',legacy_table)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',legacy_table);
    FOR legacy_policy IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=legacy_table
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',
        legacy_policy.policyname,legacy_table);
    END LOOP;
    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',
      legacy_table
    );
  END LOOP;
END $$;

-- Do not restore the former FOR ALL TO anon policies: they allowed anyone
-- to alter companies, stock, loans, returns and audit records.
-- Legacy datasets remain accessible to authorized administrative
-- connections for migration, reconciliation and historical retention.
