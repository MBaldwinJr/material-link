import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RoleAccess } from "@/components/auth/role-access";
import { EmptyState, LoadingGrid } from "@/components/layout/states";
import { ProdutoImportDialog } from "@/features/produtos/components/produto-import-dialog";
import { useProdutos } from "@/hooks/use-intermat";
import { useHydrated } from "@/hooks/use-hydrated";
import { ProdutoTable } from "@/features/produtos/components/produto-table";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos e materiais | InterMat" },
      {
        name: "description",
        content: "Catálogo de materiais sincronizado com estoque, custo, venda e localização.",
      },
      { property: "og:title", content: "Produtos e materiais | InterMat" },
      {
        property: "og:description",
        content: "Consulte estoque atual, estoque mínimo e valores de cada material.",
      },
    ],
  }),
  component: ProdutosPage,
});

function ProdutosPage() {
  const hydrated = useHydrated();
  const { data: produtos } = useProdutos();
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!produtos) return [];
    const q = search.trim().toLocaleLowerCase("pt-BR");
    if (!q) return produtos;
    return produtos.filter((produto) =>
      [produto.codigo, produto.descricao, produto.marca, produto.categoria, produto.fornecedor, produto.localizacao]
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(q)),
    );
  }, [produtos, search]);

  return (
    <AppShell
      title="Produtos e materiais"
      description="Catálogo sincronizado com o estoque, com alerta de nível mínimo."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Input
          type="search"
          aria-label="Buscar produtos"
          placeholder="Buscar por código, descrição, marca ou fornecedor"
          className="max-w-lg"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <RoleAccess roles={["admin", "gestor"]}>
          <ProdutoImportDialog />
        </RoleAccess>
      </div>

      {!hydrated || !produtos ? (
        <LoadingGrid />
      ) : produtos.length === 0 ? (
        <EmptyState
          title="Nenhum produto cadastrado"
          description="Cadastre materiais para liberá-los em empréstimos."
        />
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {filtered.length} de {produtos.length} produtos encontrados
          </p>
          {filtered.length === 0 ? (
            <EmptyState title="Nenhum produto encontrado" description="Altere o termo da busca." />
          ) : (
            <ProdutoTable produtos={filtered} />
          )}
        </div>
      )}
    </AppShell>
  );
}
