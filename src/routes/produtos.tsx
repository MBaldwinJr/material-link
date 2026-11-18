import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, LoadingGrid } from "@/components/layout/states";
import { ProdutoImportDialog } from "@/features/produtos/components/produto-import-dialog";
import { useProdutos } from "@/hooks/use-intermat";
import { useHydrated } from "@/hooks/use-hydrated";
import { ProdutoTable } from "@/features/produtos/components/produto-table";

export const Route = createFileRoute("/produtos")({
  beforeLoad: () => { throw redirect({ to: "/rede" }); },
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

  return (
    <AppShell
      title="Produtos e materiais"
      description="Catálogo sincronizado com o estoque, com alerta de nível mínimo."
    >
      <div className="mb-4 flex justify-end">
        <ProdutoImportDialog />
      </div>

      {!hydrated || !produtos ? (
        <LoadingGrid />
      ) : produtos.length === 0 ? (
        <EmptyState
          title="Nenhum produto cadastrado"
          description="Cadastre materiais para liberá-los em empréstimos."
        />
      ) : (
        <ProdutoTable produtos={produtos} />
      )}
    </AppShell>
  );
}
