import { EmprestimoStatusBadge } from "@/components/layout/status-badges";
import { formatCurrency, formatDate } from "@/lib/format";
import { DataTable } from "@/features/shared/components/data-table";
import { Emprestimo, Empresa, Produto } from "@/types/domain";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface EmprestimoTableProps {
  readonly emprestimos: Emprestimo[];
  readonly empresas: Empresa[];
  readonly produtos: Produto[];
}

const saldoAbertoCentavos = (loan: Emprestimo) => 
  (loan.quantidade - loan.quantidadeDevolvida) * loan.valorUnitarioCentavos;

export function EmprestimoTable({ emprestimos, empresas, produtos }: EmprestimoTableProps) {
  return (
    <TooltipProvider>
      <DataTable
        data={emprestimos}
        columns={[
          { header: "Nº", key: "numero", className: "font-mono text-xs font-bold text-primary" },
          {
            header: "Empresa",
            key: "empresaId",
            className: "text-sm font-medium",
            render: (loan) => empresas.find(e => e.id === loan.empresaId)?.nomeFantasia ?? "—",
          },
          {
            header: "Produto",
            key: "produtoId",
            className: "text-sm",
            render: (loan) => {
              const p = produtos.find(p => p.id === loan.produtoId);
              return (
                <div className="flex flex-col">
                  <span>{p?.descricao ?? "—"}</span>
                  <span className="text-[10px] text-muted-foreground">{p?.codigo}</span>
                </div>
              );
            },
          },
          {
            header: "Qtd / Retorno",
            key: "quantidade",
            className: "text-right text-sm",
            render: (loan) => (
              <div className="flex flex-col items-end">
                <span className="font-bold">{loan.quantidade}</span>
                <span className="text-[10px] text-muted-foreground">{loan.quantidadeDevolvida} devolvidos</span>
              </div>
            ),
          },
          {
            header: "Saldo aberto",
            key: "saldoAberto",
            className: "text-right text-sm",
            render: (loan) => {
              const saldo = saldoAbertoCentavos(loan);
              return (
                <span className={saldo > 0 ? "text-orange-600 font-bold" : "text-muted-foreground"}>
                  {formatCurrency(saldo)}
                </span>
              );
            },
          },
          {
            header: "Prazo",
            key: "prazoDevolucao",
            className: "text-sm",
            render: (loan) => {
              const isOverdue = new Date(loan.prazoDevolucao) < new Date() && loan.status !== "devolvido";
              return (
                <span className={isOverdue ? "text-destructive font-bold animate-pulse" : ""}>
                  {formatDate(loan.prazoDevolucao)}
                </span>
              );
            },
          },
          {
            header: "Logística",
            key: "logistica",
            className: "text-muted-foreground text-xs",
            render: (loan) => (
              <Tooltip>
                <TooltipTrigger className="text-left cursor-default flex items-center gap-1">
                  <div className="flex flex-col">
                    <span className="truncate max-w-[80px]">{loan.motorista || "—"}</span>
                    <span className="truncate max-w-[80px]">{loan.veiculo || "—"}</span>
                  </div>
                  {(loan.motorista || loan.veiculo) && <Info className="size-3 opacity-50" />}
                </TooltipTrigger>
                {(loan.motorista || loan.veiculo) && (
                  <TooltipContent>
                    <p>Motorista: {loan.motorista || "Não informado"}</p>
                    <p>Veículo: {loan.veiculo || "Não informado"}</p>
                    {loan.responsavel && <p className="border-t mt-1 pt-1">Responsável: {loan.responsavel}</p>}
                  </TooltipContent>
                )}
              </Tooltip>
            ),
          },
          {
            header: "Status",
            key: "status",
            render: (loan) => <EmprestimoStatusBadge status={loan.status} />,
          },
        ]}
      />
    </TooltipProvider>
  );
}
