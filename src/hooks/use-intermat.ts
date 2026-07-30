import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createEmpresa, listEmpresas, type EmpresaInput } from "@/services/empresa-service";
import {
  createProduto,
  importProdutos,
  listProdutos,
  type ProdutoInput,
} from "@/services/produto-service";
import type { ProdutoImportRow } from "@/features/produtos/lib/produto-import";
import {
  createEmprestimo,
  listDevolucoes,
  listEmprestimos,
  registrarDevolucao,
  type DevolucaoInput,
  type EmprestimoInput,
} from "@/services/emprestimo-service";
import {
  getDashboardMetrics,
  getRankingEmpresas,
  getRankingProdutos,
  getSerieMensal,
} from "@/services/dashboard-service";
import { getDatabase } from "@/services/mock-db";

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
    queryFn: () => {
      const db = getDatabase();
      return {
        motoristas: db.motoristas,
        veiculos: db.veiculos,
        movimentacoes: db.movimentacoes,
        auditoria: db.auditoria,
      };
    },
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: KEYS.dashboard,
    queryFn: () => ({
      metrics: getDashboardMetrics(),
      serie: getSerieMensal(),
      rankingEmpresas: getRankingEmpresas(),
      rankingProdutos: getRankingProdutos(),
    }),
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
