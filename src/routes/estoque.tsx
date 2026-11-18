import { createFileRoute, redirect } from "@tanstack/react-router";

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
import { useEmpresas, useOperacional, useProdutos } from "@/hooks/use-intermat";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/estoque")({
  beforeLoad: () => { throw redirect({ to: "/rede" }); },
  head: () => ({
    meta: [
      { title: "Movimentações de estoque | InterMat" },
      {
        name: "description",
        content: "Kardex de entradas e saídas geradas por empréstimos e devoluções de materiais.",
      },
      { property: "og:title", content: "Movimentações de estoque | InterMat" },
      {
        property: "og:description",
        content: "Rastreabilidade de cada movimentação por usuário, empresa e data.",
      },
    ],
  }),
  component: EstoquePage,
});

function EstoquePage() {
  const hydrated = useHydrated();
  const { data: operacional } = useOperacional();
  const { data: produtos } = useProdutos();
  const { data: empresas } = useEmpresas();

  return (
    <AppShell
      title="Movimentações de estoque"
      description="Toda saída de empréstimo e todo retorno de devolução são registrados aqui."
    >
      {!hydrated || !operacional ? (
        <LoadingGrid />
      ) : operacional.movimentacoes.length === 0 ? (
        <EmptyState
          title="Sem movimentações"
          description="Os lançamentos aparecem automaticamente ao registrar empréstimos."
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operacional.movimentacoes.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="text-sm">
                      {new Date(mov.data).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{mov.origem}</TableCell>
                    <TableCell className="text-sm">
                      {produtos?.find((item) => item.id === mov.produtoId)?.descricao ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {empresas?.find((item) => item.id === mov.empresaId)?.nomeFantasia ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          mov.tipo === "saida"
                            ? "bg-destructive/10 text-destructive border-transparent"
                            : "bg-chart-2/15 text-chart-2 border-transparent"
                        }
                      >
                        {mov.tipo === "saida" ? "Saída" : "Entrada"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{mov.quantidade}</TableCell>
                    <TableCell className="text-sm">{mov.usuario}</TableCell>
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
