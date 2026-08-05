import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { 
  listEmpresas, 
  createEmpresa, 
  listProdutos, 
  createProduto, 
  listEmprestimos, 
  createEmprestimo,
  getDashboardData,
  registrarDevolucao,
  listDevolucoes,
  importProdutos
} from "@/services/cloud-service";
import type { 
  EmpresaInput, 
  ProdutoInput, 
  EmprestimoInput, 
  DevolucaoInput 
} from "@/services/cloud-service";
// import { importProdutos } from "@/services/produto-service";
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
      const { supabase } = await import("@/integrations/supabase/client");
      const [auditRes, moveRes, driversRes, vehiclesRes] = await Promise.all([
        supabase.from("auditoria").select("*").order("data", { ascending: false }),
        supabase.from("movimentacoes_estoque").select("*").order("data", { ascending: false }),
        supabase.from("motoristas" as any).select("*").order("nome"),
        supabase.from("veiculos" as any).select("*").order("placa"),
      ]);

      const motoristas = (driversRes.data as any[] || []).map(row => ({
        id: row.id,
        nome: row.nome,
        cnh: row.cnh,
        telefone: row.telefone
      }));
      const veiculos = (vehiclesRes.data as any[] || []).map(row => ({
        id: row.id,
        placa: row.placa,
        modelo: row.modelo,
        capacidade: row.capacidade
      }));
      const movimentacoes = (moveRes.data as any[] || []).map(row => ({
        id: row.id,
        produtoId: row.produto_id,
        empresaId: row.empresa_id,
        tipo: row.tipo as any,
        quantidade: Number(row.quantidade),
        usuario: row.usuario,
        data: row.data,
        origem: row.origem
      }));
      const auditoria = (auditRes.data as any[] || []).map(row => ({
        id: row.id,
        usuario: row.usuario,
        acao: row.acao,
        entidade: row.entidade,
        data: row.data,
        detalhes: typeof (row as any).detalhes === 'string' ? (row as any).detalhes : JSON.stringify((row as any).detalhes)
      }));

      return { motoristas, veiculos, movimentacoes, auditoria };
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
