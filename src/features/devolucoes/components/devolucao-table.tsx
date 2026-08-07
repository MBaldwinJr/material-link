import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { DataTable } from "@/features/shared/components/data-table";
import { Devolucao, Emprestimo, Produto } from "@/types/domain";

interface DevolucaoTableProps {
  readonly devolucoes: Devolucao[];
  readonly emprestimos: Emprestimo[];
  readonly produtos: Produto[];
}

const TIPO_LABEL: Record<Devolucao["tipo"], string> = {
  total: "Devolução total",
  parcial: "Devolução parcial",
  troca: "Troca de produto",
  avaria: "Avaria registrada",
  perda: "Perda (débito financeiro)",
};

export function DevolucaoTable({ devolucoes, emprestimos, produtos }: DevolucaoTableProps) {
  return (
    <DataTable
      data={devolucoes}
      columns={[
        {
          header: "Data",
          key: "data",
          className: "text-sm",
          render: (item) => formatDate(item.data),
        },
        {
          header: "Empréstimo",
          key: "emprestimoId",
          className: "font-mono text-xs",
          render: (item) => emprestimos.find((e) => e.id === item.emprestimoId)?.numero ?? "—",
        },
        {
          header: "Produto",
          key: "produto",
          className: "text-sm",
          render: (item) => {
            const loan = emprestimos.find((e) => e.id === item.emprestimoId);
            return produtos.find((p) => p.id === loan?.produtoId)?.descricao ?? "—";
          },
        },
        {
          header: "Tipo",
          key: "tipo",
          render: (item) => <Badge variant="secondary">{TIPO_LABEL[item.tipo]}</Badge>,
        },
        {
          header: "Quantidade",
          key: "quantidade",
          className: "text-right text-sm",
        },
        {
          header: "Responsável",
          key: "responsavel",
          className: "text-sm",
        },
        {
          header: "Observações",
          key: "observacoes",
          className: "text-muted-foreground text-xs",
          render: (item) => item.observacoes || "—",
        },
      ]}
    />
  );
}
