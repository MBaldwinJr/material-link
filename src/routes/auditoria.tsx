import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, LoadingGrid } from "@/components/layout/states";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOperacional } from "@/hooks/use-intermat";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/auditoria")({
  head: () => ({
    meta: [
      { title: "Trilha de auditoria | InterMat" },
      {
        name: "description",
        content: "Registro de todas as inclusões, alterações e exclusões feitas no sistema.",
      },
      { property: "og:title", content: "Trilha de auditoria | InterMat" },
      {
        property: "og:description",
        content: "Rastreabilidade total das operações por usuário e data.",
      },
    ],
  }),
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const hydrated = useHydrated();
  const { data } = useOperacional();

  return (
    <AppShell
      title="Auditoria"
      description="Histórico imutável das operações realizadas no sistema."
    >
      {!hydrated || !data ? (
        <LoadingGrid />
      ) : data.auditoria.length === 0 ? (
        <EmptyState
          title="Sem registros"
          description="As ações realizadas no sistema aparecerão nesta trilha."
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data / hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.auditoria.map((registro) => (
                  <TableRow key={registro.id}>
                    <TableCell className="text-sm">
                      {new Date(registro.data).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-sm">{registro.usuario}</TableCell>
                    <TableCell className="text-sm font-medium">{registro.acao}</TableCell>
                    <TableCell className="font-mono text-xs">{registro.entidade}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {registro.detalhes}
                    </TableCell>
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
