import { createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { LoadingGrid } from "@/components/layout/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/logistica")({
  beforeLoad: () => { throw redirect({ to: "/rede" }); },
  head: () => ({
    meta: [
      { title: "Logística e frota | InterMat" },
      {
        name: "description",
        content: "Motoristas e veículos disponíveis para entrega e retirada de materiais.",
      },
      { property: "og:title", content: "Logística e frota | InterMat" },
      {
        property: "og:description",
        content: "Controle da frota e dos responsáveis por cada entrega.",
      },
    ],
  }),
  component: LogisticaPage,
});

function LogisticaPage() {
  const hydrated = useHydrated();
  const { data } = useOperacional();

  return (
    <AppShell
      title="Logística"
      description="Motoristas e veículos vinculados às entregas e retiradas de materiais."
    >
      {!hydrated || !data ? (
        <LoadingGrid rows={2} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Motoristas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNH</TableHead>
                    <TableHead>Telefone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.motoristas.map((motorista) => (
                    <TableRow key={motorista.id}>
                      <TableCell className="text-sm font-medium">{motorista.nome}</TableCell>
                      <TableCell className="font-mono text-xs">{motorista.cnh}</TableCell>
                      <TableCell className="text-sm">{motorista.telefone}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Veículos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Capacidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.veiculos.map((veiculo) => (
                    <TableRow key={veiculo.id}>
                      <TableCell className="font-mono text-xs">{veiculo.placa}</TableCell>
                      <TableCell className="text-sm font-medium">{veiculo.modelo}</TableCell>
                      <TableCell className="text-sm">{veiculo.capacidade}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
