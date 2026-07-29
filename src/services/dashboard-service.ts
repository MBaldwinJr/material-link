import { listEmpresas } from "./empresa-service";
import { listDevolucoes, listEmprestimos, saldoAbertoCentavos } from "./emprestimo-service";
import { listProdutos } from "./produto-service";
import { daysBetween } from "@/lib/format";

export interface DashboardMetrics {
  readonly totalEmprestadoCentavos: number;
  readonly totalDevolvidoCentavos: number;
  readonly saldoAbertoCentavos: number;
  readonly emprestimosAtivos: number;
  readonly empresasComPendencia: number;
  readonly materiaisEmAtraso: number;
  readonly tempoMedioDevolucaoDias: number;
  readonly capitalParadoCentavos: number;
}

export interface SerieMensal {
  readonly mes: string;
  readonly emprestimos: number;
  readonly devolucoes: number;
}

export interface RankingItem {
  readonly nome: string;
  readonly valor: number;
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function getDashboardMetrics(): DashboardMetrics {
  const emprestimos = listEmprestimos();
  const devolucoes = listDevolucoes();

  const totalEmprestado = emprestimos.reduce(
    (sum, loan) => sum + loan.quantidade * loan.valorUnitarioCentavos,
    0,
  );
  const totalDevolvido = emprestimos.reduce(
    (sum, loan) => sum + loan.quantidadeDevolvida * loan.valorUnitarioCentavos,
    0,
  );
  const emAberto = emprestimos.filter((loan) => loan.status !== "devolvido");
  const atrasados = emprestimos.filter((loan) => loan.status === "atrasado");

  const tempos = devolucoes
    .map((devolucao) => {
      const loan = emprestimos.find((item) => item.id === devolucao.emprestimoId);
      return loan ? daysBetween(loan.data, devolucao.data) : null;
    })
    .filter((value): value is number => value !== null);

  return {
    totalEmprestadoCentavos: totalEmprestado,
    totalDevolvidoCentavos: totalDevolvido,
    saldoAbertoCentavos: emAberto.reduce((sum, loan) => sum + saldoAbertoCentavos(loan), 0),
    emprestimosAtivos: emAberto.length,
    empresasComPendencia: new Set(emAberto.map((loan) => loan.empresaId)).size,
    materiaisEmAtraso: atrasados.reduce(
      (sum, loan) => sum + (loan.quantidade - loan.quantidadeDevolvida),
      0,
    ),
    tempoMedioDevolucaoDias: tempos.length
      ? Math.round(tempos.reduce((sum, value) => sum + value, 0) / tempos.length)
      : 0,
    capitalParadoCentavos: atrasados.reduce((sum, loan) => sum + saldoAbertoCentavos(loan), 0),
  };
}

export function getSerieMensal(): SerieMensal[] {
  const emprestimos = listEmprestimos();
  const devolucoes = listDevolucoes();
  const buckets: SerieMensal[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const ref = new Date();
    ref.setMonth(ref.getMonth() - offset, 1);
    const key = `${ref.getFullYear()}-${ref.getMonth()}`;

    const emprestado = emprestimos
      .filter((loan) => monthKey(loan.data) === key)
      .reduce((sum, loan) => sum + (loan.quantidade * loan.valorUnitarioCentavos) / 100, 0);

    const devolvido = devolucoes
      .filter((devolucao) => monthKey(devolucao.data) === key)
      .reduce((sum, devolucao) => {
        const loan = emprestimos.find((item) => item.id === devolucao.emprestimoId);
        return sum + (loan ? (devolucao.quantidade * loan.valorUnitarioCentavos) / 100 : 0);
      }, 0);

    buckets.push({
      mes: MESES[ref.getMonth()],
      emprestimos: Math.round(emprestado),
      devolucoes: Math.round(devolvido),
    });
  }

  return buckets;
}

function monthKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export function getRankingEmpresas(): RankingItem[] {
  const empresas = listEmpresas();
  return listEmprestimos()
    .filter((loan) => loan.status !== "devolvido")
    .reduce<RankingItem[]>((acc, loan) => {
      const empresa = empresas.find((item) => item.id === loan.empresaId);
      if (!empresa) return acc;
      const existing = acc.find((item) => item.nome === empresa.nomeFantasia);
      const valor = Math.round(saldoAbertoCentavos(loan) / 100);
      if (existing) {
        return acc.map((item) =>
          item.nome === existing.nome ? { nome: item.nome, valor: item.valor + valor } : item,
        );
      }
      return [...acc, { nome: empresa.nomeFantasia, valor }];
    }, [])
    .sort((a, b) => b.valor - a.valor);
}

export function getRankingProdutos(): RankingItem[] {
  const produtos = listProdutos();
  return listEmprestimos()
    .reduce<RankingItem[]>((acc, loan) => {
      const produto = produtos.find((item) => item.id === loan.produtoId);
      if (!produto) return acc;
      const existing = acc.find((item) => item.nome === produto.descricao);
      if (existing) {
        return acc.map((item) =>
          item.nome === existing.nome
            ? { nome: item.nome, valor: item.valor + loan.quantidade }
            : item,
        );
      }
      return [...acc, { nome: produto.descricao, valor: loan.quantidade }];
    }, [])
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);
}
