import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, LoadingGrid } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { useEmpresas } from "@/hooks/use-intermat";
import { useHydrated } from "@/hooks/use-hydrated";
import { EmpresaFormDialog } from "@/features/empresas/components/empresa-form-dialog";
import { EmpresaTable } from "@/features/empresas/components/empresa-table";
import { Empresa } from "@/types/domain";

export const Route = createFileRoute("/empresas")({
  beforeLoad: () => { throw redirect({ to: "/rede" }); },
  head: () => ({
    meta: [
      { title: "Empresas parceiras | InterMat" },
      {
        name: "description",
        content: "Cadastro de empresas parceiras, limites de crédito e prazos de devolução.",
      },
      { property: "og:title", content: "Empresas parceiras | InterMat" },
      {
        property: "og:description",
        content: "Gerencie parceiros, limites financeiros e status operacional.",
      },
    ],
  }),
  component: EmpresasPage,
});

function EmpresasPage() {
  const hydrated = useHydrated();
  const { data: empresas } = useEmpresas();
  const [open, setOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);

  const handleEdit = (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingEmpresa(null);
    }
  };

  return (
    <AppShell
      title="Empresas parceiras"
      description="Cadastro completo, limites financeiros e status de crédito dos parceiros."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Nova empresa
        </Button>
      }
    >
      <EmpresaFormDialog
        open={open}
        onOpenChange={handleOpenChange}
        empresa={editingEmpresa}
      />

      {!hydrated || !empresas ? (
        <LoadingGrid />
      ) : empresas.length === 0 ? (
        <EmptyState
          title="Nenhuma empresa cadastrada"
          description="Cadastre o primeiro parceiro para começar a registrar empréstimos."
        />
      ) : (
        <EmpresaTable empresas={empresas} onEdit={handleEdit} />
      )}
    </AppShell>
  );
}
