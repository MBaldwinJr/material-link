import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { 
  listEmpresas, 
  createEmpresa, 
  listProdutos, 
  createProduto, 
  listEmprestimos, 
  createEmprestimo,
  getDashboardData
} from "@/services/cloud-service";
import type { EmpresaInput } from "@/services/empresa-service";
import type { ProdutoInput } from "@/services/produto-service";
import type { EmprestimoInput, DevolucaoInput } from "@/services/emprestimo-service";
import { registrarDevolucao, listDevolucoes } from "@/services/emprestimo-service"; // Still need these or migrate them too
import { importProdutos } from "@/services/produto-service";
import type { ProdutoImportRow } from "@/features/produtos/lib/produto-import";

const KEYS = {
  empresas: ["empresas"] as const,
  produtos: ["produtos"] as const,
  emprestimos: ["emprestimos"] as const,
  devolucoes: ["devolucoes"] as const,
  dashboard: ["dashboard"] as const,
  operacional: ["operacional"] as const,
};

export function useEmpresas() {
  return useQuery({ queryKey: KEYS.empresas, queryFn: listEmpresas });
}

export function useProdutos() {
  return useQuery({ queryKey: KEYS.produtos, queryFn: listProdutos });
}

export function useEmprestimos() {
  return useQuery({ queryKey: KEYS.emprestimos, queryFn: listEmprestimos });
}

export function useDevolucoes() {
  return useQuery({ queryKey: KEYS.devolucoes, queryFn: listDevolucoes });
}

export function useOperacional() {
  return useQuery({
    queryKey: KEYS.operacional,
    queryFn: async () => {
      const { data: audit } = await (await import("@/integrations/supabase/client")).supabase.from("auditoria").select("*").order("data", { ascending: false });
      return {
        motoristas: [], // TODO: Migrate
        veiculos: [], // TODO: Migrate
        movimentacoes: [], // TODO: Migrate
        auditoria: audit || [],
      };
    },
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: KEYS.dashboard,
    queryFn: () => getDashboardData(),
  });
}

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    Object.values(KEYS).forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  };
}

export function useCreateEmpresa() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: EmpresaInput) => createEmpresa(input),
    onSuccess: invalidate,
  });
}

export function useCreateProduto() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: ProdutoInput) => createProduto(input),
    onSuccess: invalidate,
  });
}

export function useCreateEmprestimo() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: EmprestimoInput) => createEmprestimo(input),
    onSuccess: invalidate,
  });
}

export function useRegistrarDevolucao() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: DevolucaoInput) => registrarDevolucao(input),
    onSuccess: invalidate,
  });
}

export function useImportProdutos() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: { rows: readonly ProdutoImportRow[]; origem: string }) =>
      importProdutos(input.rows, input.origem),
    onSuccess: invalidate,
  });
}
