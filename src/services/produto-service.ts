import { createId, getDatabase, mutate } from "./mock-db";
import type { Produto } from "@/types/domain";

export type ProdutoInput = Omit<Produto, "id">;

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
