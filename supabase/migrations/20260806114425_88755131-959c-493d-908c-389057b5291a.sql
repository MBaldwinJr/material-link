GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emprestimos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devolucoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_estoque TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auditoria TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motoristas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO authenticated;

GRANT ALL ON public.empresas TO service_role;
GRANT ALL ON public.produtos TO service_role;
GRANT ALL ON public.emprestimos TO service_role;
GRANT ALL ON public.devolucoes TO service_role;
GRANT ALL ON public.movimentacoes_estoque TO service_role;
GRANT ALL ON public.auditoria TO service_role;
GRANT ALL ON public.motoristas TO service_role;
GRANT ALL ON public.veiculos TO service_role;