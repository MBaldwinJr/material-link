import { createId, getDatabase, mutate } from "./mock-db";
import type { Devolucao, DevolucaoTipo, Emprestimo, EmprestimoStatus } from "@/types/domain";
import { isOverdue } from "@/lib/format";

export interface EmprestimoInput {
  readonly empresaId: string;
  readonly produtoId: string;
  readonly quantidade: number;
  readonly valorUnitarioCentavos: number;
  readonly data: string;
  readonly prazoDevolucao: string;
  readonly responsavel: string;
  readonly motorista: string;
  readonly veiculo: string;
  readonly observacoes: string;
}

export interface DevolucaoInput {
  readonly emprestimoId: string;
  readonly tipo: DevolucaoTipo;
  readonly quantidade: number;
  readonly responsavel: string;
  readonly observacoes: string;
}

function resolveStatus(loan: Emprestimo): EmprestimoStatus {
  if (loan.quantidadeDevolvida >= loan.quantidade) return "devolvido";
  if (isOverdue(loan.prazoDevolucao)) return "atrasado";
  return loan.quantidadeDevolvida > 0 ? "parcial" : "aberto";
}

export function listEmprestimos(): Emprestimo[] {
  return getDatabase()
    .emprestimos.map((loan) => ({ ...loan, status: resolveStatus(loan) }))
    .sort((a, b) => b.data.localeCompare(a.data));
}

export function listDevolucoes(): Devolucao[] {
  return [...getDatabase().devolucoes].sort((a, b) => b.data.localeCompare(a.data));
}

export function saldoAbertoCentavos(loan: Emprestimo): number {
  return (loan.quantidade - loan.quantidadeDevolvida) * loan.valorUnitarioCentavos;
}

export function createEmprestimo(input: EmprestimoInput): Emprestimo {
  const numero = `EMP-${String(getDatabase().emprestimos.length + 200).padStart(5, "0")}`;
  const loan: Emprestimo = {
    ...input,
    id: createId("loan"),
    numero,
    quantidadeDevolvida: 0,
    status: "aberto",
  };

  mutate((db) => {
    db.emprestimos.push(loan);
    const produto = db.produtos.find((item) => item.id === loan.produtoId);
    if (produto) {
      const index = db.produtos.indexOf(produto);
      db.produtos[index] = {
        ...produto,
        estoqueAtual: Math.max(0, produto.estoqueAtual - loan.quantidade),
      };
    }
    db.movimentacoes.unshift({
      id: createId("mov"),
      produtoId: loan.produtoId,
      empresaId: loan.empresaId,
      tipo: "saida",
      quantidade: loan.quantidade,
      usuario: loan.responsavel,
      data: loan.data,
      origem: numero,
    });
    db.auditoria.unshift({
      id: createId("aud"),
      usuario: "usuario.atual",
      acao: "Criação de empréstimo",
      entidade: numero,
      data: new Date().toISOString(),
      detalhes: `${loan.quantidade} un. movimentadas.`,
    });
  });

  return loan;
}

export function registrarDevolucao(input: DevolucaoInput): Devolucao {
  const devolucao: Devolucao = {
    ...input,
    id: createId("dev"),
    data: new Date().toISOString(),
  };

  mutate((db) => {
    const loan = db.emprestimos.find((item) => item.id === input.emprestimoId);
    if (!loan) throw new Error("Empréstimo não encontrado.");

    const index = db.emprestimos.indexOf(loan);
    const devolvida = Math.min(
      loan.quantidade,
      loan.quantidadeDevolvida + Math.max(0, input.quantidade),
    );
    db.emprestimos[index] = { ...loan, quantidadeDevolvida: devolvida };
    db.devolucoes.unshift(devolucao);

    const retornaEstoque = input.tipo === "total" || input.tipo === "parcial";
    if (retornaEstoque) {
      const produto = db.produtos.find((item) => item.id === loan.produtoId);
      if (produto) {
        const produtoIndex = db.produtos.indexOf(produto);
        db.produtos[produtoIndex] = {
          ...produto,
          estoqueAtual: produto.estoqueAtual + input.quantidade,
        };
      }
      db.movimentacoes.unshift({
        id: createId("mov"),
        produtoId: loan.produtoId,
        empresaId: loan.empresaId,
        tipo: "entrada",
        quantidade: input.quantidade,
        usuario: input.responsavel,
        data: devolucao.data,
        origem: loan.numero,
      });
    }

    db.auditoria.unshift({
      id: createId("aud"),
      usuario: "usuario.atual",
      acao: `Devolução (${input.tipo})`,
      entidade: loan.numero,
      data: devolucao.data,
      detalhes: input.observacoes || `${input.quantidade} un.`,
    });
  });

  return devolucao;
}
