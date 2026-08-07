import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Undo2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, LoadingGrid } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import {
  useDevolucoes,
  useEmprestimos,
  useProdutos,
} from "@/hooks/use-intermat";
import { useHydrated } from "@/hooks/use-hydrated";
import { DevolucaoFormDialog } from "@/features/devolucoes/components/devolucao-form-dialog";
import { DevolucaoTable } from "@/features/devolucoes/components/devolucao-table";

export const Route = createFileRoute("/devolucoes")({
  head: () => ({
    meta: [
      { title: "Devoluções e ocorrências | InterMat" },
      {
        name: "description",
        content:
          "Registre devoluções totais, parciais, trocas, avarias e perdas com impacto automático no estoque.",
      },
      { property: "og:title", content: "Devoluções e ocorrências | InterMat" },
      {
        property: "og:description",
        content: "Ocorrências de retorno de materiais com rastreabilidade completa.",
      },
    ],
  }),
  component: DevolucoesPage,
});

function DevolucoesPage() {
  const hydrated = useHydrated();
  const { data: devolucoes } = useDevolucoes();
  const { data: emprestimos } = useEmprestimos();
  const { data: produtos } = useProdutos();
  const [open, setOpen] = useState(false);

  return (
    <AppShell
      title="Devoluções"
      description="Total, parcial, troca, avaria ou perda — com atualização automática de estoque e saldo."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Undo2 className="size-4" /> Registrar devolução
        </Button>
      }
    >
      <DevolucaoFormDialog open={open} onOpenChange={setOpen} />

      {!hydrated || !devolucoes || !emprestimos || !produtos ? (
        <LoadingGrid />
      ) : devolucoes.length === 0 ? (
        <EmptyState
          title="Nenhuma devolução registrada"
          description="As ocorrências de retorno aparecerão aqui com histórico completo."
        />
      ) : (
        <DevolucaoTable 
          devolucoes={devolucoes} 
          emprestimos={emprestimos} 
          produtos={produtos} 
        />
      )}
    </AppShell>
  );
}
