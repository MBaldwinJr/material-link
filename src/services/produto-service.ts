import { createId, getDatabase, mutate } from "./mock-db";
import type { Produto } from "@/types/domain";
import type { ProdutoImportRow } from "@/features/produtos/lib/produto-import";

export type ProdutoInput = Omit<Produto, "id">;

export interface ImportProdutosSummary {
  readonly criados: number;
  readonly atualizados: number;
}

export function listProdutos(): Produto[] {
  return [...getDatabase().produtos].sort((a, b) => a.descricao.localeCompare(b.descricao));
}

export function getProduto(id: string): Produto | undefined {
  return getDatabase().produtos.find((produto) => produto.id === id);
}

export function createProduto(input: ProdutoInput): Produto {
  const produto: Produto = { ...input, id: createId("prod") };
  mutate((db) => {
    db.produtos.push(produto);
    db.auditoria.unshift({
      id: createId("aud"),
      usuario: "usuario.atual",
      acao: "Cadastro de produto",
      entidade: produto.codigo,
      data: new Date().toISOString(),
      detalhes: produto.descricao,
    });
  });
  return produto;
}

export function importProdutos(
  rows: readonly ProdutoImportRow[],
  origem: string,
): ImportProdutosSummary {
  let criados = 0;
  let atualizados = 0;

  mutate((db) => {
    rows.forEach((row) => {
      const index = db.produtos.findIndex(
        (produto) => produto.codigo.toLowerCase() === row.codigo.toLowerCase(),
      );
      if (index >= 0) {
        db.produtos[index] = { ...db.produtos[index], ...row };
        atualizados += 1;
        return;
      }
      db.produtos.push({ ...row, id: createId("prod") });
      criados += 1;
    });

    db.auditoria.unshift({
      id: createId("aud"),
      usuario: "usuario.atual",
      acao: "Importação de produtos",
      entidade: origem,
      data: new Date().toISOString(),
      detalhes: `${criados} criados · ${atualizados} atualizados`,
    });
  });

  return { criados, atualizados };
}
