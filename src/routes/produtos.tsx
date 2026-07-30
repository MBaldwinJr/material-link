import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, LoadingGrid } from "@/components/layout/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProdutoImportDialog } from "@/features/produtos/components/produto-import-dialog";
import { useProdutos } from "@/hooks/use-intermat";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatCurrency } from "@/lib/format";

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
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead>Localização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell className="font-mono text-xs">{produto.codigo}</TableCell>
                    <TableCell>
                      <p className="font-medium">{produto.descricao}</p>
                      <p className="text-muted-foreground text-xs">
                        {produto.marca} · {produto.unidade}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">{produto.categoria}</TableCell>
                    <TableCell className="text-sm">{produto.fornecedor}</TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(produto.custoCentavos)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(produto.vendaCentavos)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <span className="mr-2">{produto.estoqueAtual}</span>
                      {produto.estoqueAtual <= produto.estoqueMinimo ? (
                        <Badge className="bg-destructive/10 text-destructive border-transparent">
                          Baixo
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{produto.localizacao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
