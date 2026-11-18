import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, LoadingGrid } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { useEmpresas, useEmprestimos, useProdutos } from "@/hooks/use-intermat";
import { useHydrated } from "@/hooks/use-hydrated";
import { EmprestimoFormDialog } from "@/features/emprestimos/components/emprestimo-form-dialog";
import { EmprestimoTable } from "@/features/emprestimos/components/emprestimo-table";

export const Route = createFileRoute("/emprestimos")({
  beforeLoad: () => { throw redirect({ to: "/rede" }); },
  head: () => ({
    meta: [
      { title: "Empréstimos de materiais | InterMat" },
      {
        name: "description",
        content: "Registre empréstimos entre empresas com baixa automática de estoque, prazo e logística.",
      },
      { property: "og:title", content: "Empréstimos de materiais | InterMat" },
      {
        property: "og:description",
        content: "Controle prazos, responsáveis, motoristas e saldo em aberto por empréstimo.",
      },
    ],
  }),
  component: EmprestimosPage,
});

function EmprestimosPage() {
  const hydrated = useHydrated();
  const { data: emprestimos } = useEmprestimos();
  const { data: empresas } = useEmpresas();
  const { data: produtos } = useProdutos();
  const [open, setOpen] = useState(false);

  return (
    <AppShell
      title="Empréstimos"
      description="Cada confirmação reduz o estoque, gera movimentação e atualiza o saldo da empresa."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Novo empréstimo
        </Button>
      }
    >
      <EmprestimoFormDialog open={open} onOpenChange={setOpen} />

      {!hydrated || !emprestimos || !empresas || !produtos ? (
        <LoadingGrid />
      ) : emprestimos.length === 0 ? (
        <EmptyState
          title="Nenhum empréstimo registrado"
          description="Registre o primeiro empréstimo para acompanhar prazos e saldo em aberto."
        />
      ) : (
        <EmprestimoTable 
          emprestimos={emprestimos} 
          empresas={empresas} 
          produtos={produtos} 
        />
      )}
    </AppShell>
  );
}
