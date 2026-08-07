import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { DataTable } from "@/features/shared/components/data-table";
import { Produto } from "@/types/domain";

interface ProdutoTableProps {
  readonly produtos: Produto[];
}

export function ProdutoTable({ produtos }: ProdutoTableProps) {
  return (
    <DataTable
      data={produtos}
      columns={[
        {
          header: "Código",
          key: "codigo",
          className: "font-mono text-xs",
        },
        {
          header: "Descrição",
          key: "descricao",
          render: (produto) => (
            <>
              <p className="font-medium">{produto.descricao}</p>
              <p className="text-muted-foreground text-xs">
                {produto.marca} · {produto.unidade}
              </p>
            </>
          ),
        },
        {
          header: "Categoria",
          key: "categoria",
          className: "text-sm",
        },
        {
          header: "Fornecedor",
          key: "fornecedor",
          className: "text-sm",
        },
        {
          header: "Custo",
          key: "custoCentavos",
          className: "text-right text-sm",
          render: (produto) => formatCurrency(produto.custoCentavos),
        },
        {
          header: "Venda",
          key: "vendaCentavos",
          className: "text-right text-sm",
          render: (produto) => formatCurrency(produto.vendaCentavos),
        },
        {
          header: "Estoque",
          key: "estoqueAtual",
          className: "text-right text-sm",
          render: (produto) => (
            <>
              <span className="mr-2">{produto.estoqueAtual}</span>
              {produto.estoqueAtual <= produto.estoqueMinimo && (
                <Badge className="bg-destructive/10 text-destructive border-transparent">
                  Baixo
                </Badge>
              )}
            </>
          ),
        },
        {
          header: "Localização",
          key: "localizacao",
          className: "text-sm",
        },
      ]}
    />
  );
}
