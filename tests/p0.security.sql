-- Read-only post-migration security contract checks.
-- Run with psql -v ON_ERROR_STOP=1 -f tests/p0.security.sql
DO $$
DECLARE v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'empresas','produtos','emprestimos','devolucoes',
    'movimentacoes_estoque','auditoria','motoristas','veiculos',
    'inter_mat_operadores'
  ] LOOP
    IF has_table_privilege('anon', format('public.%I', v_table), 'SELECT')
       OR has_table_privilege('anon', format('public.%I', v_table), 'INSERT')
       OR has_table_privilege('anon', format('public.%I', v_table), 'UPDATE')
       OR has_table_privilege('anon', format('public.%I', v_table), 'DELETE')
    THEN
      RAISE EXCEPTION 'P0 FAIL: anon still has privileges on %', v_table;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = v_table AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'P0 FAIL: RLS not enabled on %', v_table;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = ANY(ARRAY[
        'empresas','produtos','emprestimos','devolucoes',
        'movimentacoes_estoque','auditoria','motoristas','veiculos'
      ])
      AND ('anon' = ANY(p.roles) OR 'public' = ANY(p.roles))
  ) THEN
    RAISE EXCEPTION 'P0 FAIL: policy still allows anon/public';
  END IF;

  IF has_table_privilege('authenticated','public.emprestimos','INSERT')
     OR has_table_privilege('authenticated','public.emprestimos','UPDATE')
     OR has_table_privilege('authenticated','public.devolucoes','INSERT')
     OR has_table_privilege('authenticated','public.movimentacoes_estoque','INSERT')
     OR has_table_privilege('authenticated','public.auditoria','INSERT')
     OR has_column_privilege('authenticated','public.produtos','estoque_atual','UPDATE')
  THEN
    RAISE EXCEPTION 'P0 FAIL: direct transactional writes remain exposed';
  END IF;

  IF has_function_privilege('anon',
     'public.registrar_emprestimo_seguro(uuid,uuid,numeric,bigint,timestamptz,timestamptz,text,text,text,text)',
     'EXECUTE')
     OR has_function_privilege('anon',
     'public.registrar_devolucao_segura(uuid,text,numeric,text,text)',
     'EXECUTE')
  THEN
    RAISE EXCEPTION 'P0 FAIL: RPC executable by anonymous users';
  END IF;

  IF NOT has_function_privilege('authenticated',
     'public.registrar_emprestimo_seguro(uuid,uuid,numeric,bigint,timestamptz,timestamptz,text,text,text,text)',
     'EXECUTE')
     OR NOT has_function_privilege('authenticated',
     'public.registrar_devolucao_segura(uuid,text,numeric,text,text)',
     'EXECUTE')
  THEN
    RAISE EXCEPTION 'P0 FAIL: authenticated RPC execute grant missing';
  END IF;

  IF (SELECT prosecdef FROM pg_proc
      WHERE oid = 'public.registrar_emprestimo_seguro(uuid,uuid,numeric,bigint,timestamptz,timestamptz,text,text,text,text)'::regprocedure)
     OR (SELECT prosecdef FROM pg_proc
      WHERE oid = 'public.registrar_devolucao_segura(uuid,text,numeric,text,text)'::regprocedure)
  THEN
    RAISE EXCEPTION 'P0 FAIL: exposed RPC wrapper must remain SECURITY INVOKER';
  END IF;

  IF NOT (SELECT prosecdef FROM pg_proc
      WHERE oid = 'app_private.registrar_emprestimo(uuid,uuid,numeric,bigint,timestamptz,timestamptz,text,text,text,text)'::regprocedure)
     OR NOT (SELECT prosecdef FROM pg_proc
      WHERE oid = 'app_private.registrar_devolucao(uuid,text,numeric,text,text)'::regprocedure)
  THEN
    RAISE EXCEPTION 'P0 FAIL: internal transactions must enforce privileged atomic execution';
  END IF;
  RAISE NOTICE 'P0 PASS: authorization grants, RLS, RPC wrappers and privileges verified';
END $$;
