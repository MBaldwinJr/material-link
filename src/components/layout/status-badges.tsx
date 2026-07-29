import { Badge } from "@/components/ui/badge";
import type { EmpresaStatus, EmprestimoStatus } from "@/types/domain";

const EMPRESA_LABEL: Record<EmpresaStatus, string> = {
  ativa: "Ativa",
  suspensa: "Suspensa",
  bloqueada: "Bloqueada",
};

const EMPRESA_CLASS: Record<EmpresaStatus, string> = {
  ativa: "bg-chart-2/15 text-chart-2 border-transparent",
  suspensa: "bg-chart-4/20 text-chart-4 border-transparent",
  bloqueada: "bg-destructive/10 text-destructive border-transparent",
};

export function EmpresaStatusBadge({ status }: { readonly status: EmpresaStatus }) {
  return <Badge className={EMPRESA_CLASS[status]}>{EMPRESA_LABEL[status]}</Badge>;
}

const LOAN_LABEL: Record<EmprestimoStatus, string> = {
  aberto: "Em aberto",
  parcial: "Parcial",
  devolvido: "Devolvido",
  atrasado: "Atrasado",
};

const LOAN_CLASS: Record<EmprestimoStatus, string> = {
  aberto: "bg-secondary text-secondary-foreground border-transparent",
  parcial: "bg-chart-4/20 text-chart-4 border-transparent",
  devolvido: "bg-chart-2/15 text-chart-2 border-transparent",
  atrasado: "bg-destructive/10 text-destructive border-transparent",
};

export function EmprestimoStatusBadge({ status }: { readonly status: EmprestimoStatus }) {
  return <Badge className={LOAN_CLASS[status]}>{LOAN_LABEL[status]}</Badge>;
}
