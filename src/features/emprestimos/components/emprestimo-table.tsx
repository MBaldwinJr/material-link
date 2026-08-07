import { EmprestimoStatusBadge } from "@/components/layout/status-badges";
import { formatCurrency, formatDate } from "@/lib/format";
import { DataTable } from "@/features/shared/components/data-table";
import { Emprestimo, Empresa, Produto } from "@/types/domain";

interface EmprestimoTableProps {
  readonly emprestimos: Emprestimo[];
  readonly empresas: Empresa[];
  readonly produtos: Produto[];
}

const saldoAbertoCentavos = (loan: Emprestimo) => 
  (loan.quantidade - loan.quantidadeDevolvida) * loan.valorUnitarioCentavos;

export function EmprestimoTable({ emprestimos, empresas, produtos }: EmprestimoTableProps) {
  return (
    <DataTable
      data={emprestimos}
      columns={[
        { header: "Nº", key: "numero", className: "font-mono text-xs" },
        {
          header: "Empresa",
          key: "empresaId",
          className: "text-sm",
          render: (loan) => empresas.find(e => e.id === loan.empresaId)?.nomeFantasia ?? "—",
        },
        {
          header: "Produto",
          key: "produtoId",
          className: "text-sm",
          render: (loan) => produtos.find(p => p.id === loan.produtoId)?.descricao ?? "—",
        },
        {
          header: "Qtd. / Devolvida",
          key: "quantidade",
          className: "text-right text-sm",
          render: (loan) => `${loan.quantidade} / ${loan.quantidadeDevolvida}`,
        },
        {
          header: "Saldo aberto",
          key: "saldoAberto",
          className: "text-right text-sm",
          render: (loan) => formatCurrency(saldoAbertoCentavos(loan)),
        },
        {
          header: "Prazo",
          key: "prazoDevolucao",
          className: "text-sm",
          render: (loan) => formatDate(loan.prazoDevolucao),
        },
        {
          header: "Logística",
          key: "logistica",
          className: "text-muted-foreground text-xs",
          render: (loan) => (
            <>
              {loan.motorista || "—"}
              <br />
              {loan.veiculo || "—"}
            </>
          ),
        },
        {
          header: "Status",
          key: "status",
          render: (loan) => <EmprestimoStatusBadge status={loan.status} />,
        },
      ]}
    />
  );
}
