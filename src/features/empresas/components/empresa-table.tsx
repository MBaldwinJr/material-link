import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmpresaStatusBadge } from "@/components/layout/status-badges";
import { formatCurrency } from "@/lib/format";
import { DataTable } from "@/features/shared/components/data-table";
import { Empresa } from "@/types/domain";
import { useAccessRole } from "@/components/auth/role-access";

interface EmpresaTableProps {
  readonly empresas: Empresa[];
  readonly onEdit: (empresa: Empresa) => void;
}

export function EmpresaTable({ empresas, onEdit }: EmpresaTableProps) {
  const role = useAccessRole();
  const canManage = role === "admin" || role === "gestor";
  return (
    <DataTable
      data={empresas}
      columns={[
        {
          header: "Empresa",
          key: "nomeFantasia",
          render: (empresa) => (
            <div>
              <p className="font-medium">{empresa.nomeFantasia}</p>
              <p className="text-muted-foreground text-xs">{empresa.razaoSocial}</p>
            </div>
          ),
        },
        { header: "CNPJ", key: "cnpj", className: "text-sm" },
        { header: "Responsável", key: "responsavel", className: "text-sm" },
        {
          header: "Cidade / UF",
          key: "cidade",
          className: "text-sm",
          render: (empresa) => `${empresa.cidade} / ${empresa.estado}`,
        },
        {
          header: "Limite",
          key: "limiteCentavos",
          className: "text-right text-sm",
          render: (empresa) => formatCurrency(empresa.limiteCentavos),
        },
        {
          header: "Prazo",
          key: "prazoPadraoDias",
          className: "text-right text-sm",
          render: (empresa) => `${empresa.prazoPadraoDias} dias`,
        },
        {
          header: "Status",
          key: "status",
          render: (empresa) => <EmpresaStatusBadge status={empresa.status} />,
        },
        {
          header: "",
          key: "actions",
          className: "w-[50px]",
          render: (empresa) => canManage ? (
            <Button variant="ghost" size="icon" onClick={() => onEdit(empresa)} aria-label="Editar empresa">
              <Edit className="size-4" />
            </Button>
          ) : null,
        },
      ]}
    />
  );
}
