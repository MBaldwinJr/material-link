import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CircleDollarSign,
  Clock,
  PackageCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/layout/app-shell";
import { MetricCard } from "@/components/layout/metric-card";
import { LoadingGrid } from "@/components/layout/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard } from "@/hooks/use-intermat";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard executivo | InterMat" },
      {
        name: "description",
        content:
          "Painel executivo do InterMat com valores emprestados, saldo em aberto, atrasos e desempenho por empresa.",
      },
      { property: "og:title", content: "Dashboard executivo | InterMat" },
      {
        property: "og:description",
        content: "Controle total dos empréstimos de materiais entre empresas parceiras.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const hydrated = useHydrated();
  const { data } = useDashboard();

  return (
    <AppShell
      title="Dashboard executivo"
      description="Visão consolidada de empréstimos, devoluções e capital em poder de terceiros."
    >
      {!hydrated || !data ? (
        <LoadingGrid rows={5} />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Valor total emprestado"
              value={formatCurrency(data.metrics.totalEmprestadoCentavos)}
              icon={<TrendingUp className="size-5" />}
            />
            <MetricCard
              label="Valor devolvido"
              value={formatCurrency(data.metrics.totalDevolvidoCentavos)}
              tone="positive"
              icon={<PackageCheck className="size-5" />}
            />
            <MetricCard
              label="Saldo em aberto"
              value={formatCurrency(data.metrics.saldoAbertoCentavos)}
              tone="warning"
              icon={<CircleDollarSign className="size-5" />}
            />
            <MetricCard
              label="Capital parado (atraso)"
              value={formatCurrency(data.metrics.capitalParadoCentavos)}
              tone="danger"
              icon={<AlertTriangle className="size-5" />}
            />
            <MetricCard
              label="Empréstimos ativos"
              value={String(data.metrics.emprestimosAtivos)}
              icon={<PackageCheck className="size-5" />}
            />
            <MetricCard
              label="Empresas com pendências"
              value={String(data.metrics.empresasComPendencia)}
              tone="warning"
              icon={<Users className="size-5" />}
            />
            <MetricCard
              label="Materiais em atraso"
              value={String(data.metrics.materiaisEmAtraso)}
              hint="Unidades fora do estoque após o prazo"
              tone="danger"
              icon={<AlertTriangle className="size-5" />}
            />
            <MetricCard
              label="Tempo médio de devolução"
              value={`${data.metrics.tempoMedioDevolucaoDias} dias`}
              icon={<Clock className="size-5" />}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Empréstimos x devoluções por mês (R$)</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.serie}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="mes" fontSize={12} stroke="var(--muted-foreground)" />
                    <YAxis fontSize={12} stroke="var(--muted-foreground)" />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      name="Emprestado"
                      dataKey="emprestimos"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      name="Devolvido"
                      dataKey="devolucoes"
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Empresas com maior saldo devedor (R$)</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.rankingEmpresas} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" fontSize={12} stroke="var(--muted-foreground)" />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      width={140}
                      fontSize={11}
                      stroke="var(--muted-foreground)"
                    />
                    <Tooltip />
                    <Bar dataKey="valor" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Produtos mais emprestados (unidades)</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.rankingProdutos}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="nome" fontSize={11} stroke="var(--muted-foreground)" />
                    <YAxis fontSize={12} stroke="var(--muted-foreground)" />
                    <Tooltip />
                    <Bar dataKey="valor" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </AppShell>
  );
}
