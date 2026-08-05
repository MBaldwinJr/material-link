import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { Edit, Plus } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { EmpresaStatusBadge } from "@/components/layout/status-badges";
import { EmptyState, LoadingGrid } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCreateEmpresa, useEmpresas, useUpdateEmpresa } from "@/hooks/use-intermat";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/empresas")({
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

const schema = z.object({
  razaoSocial: z.string().trim().min(3, "Informe a razão social").max(120),
  nomeFantasia: z.string().trim().min(2, "Informe o nome fantasia").max(120),
  cnpj: z.string().trim().min(14, "CNPJ inválido").max(18),
  inscricaoEstadual: z.string().trim().max(30).default(""),
  telefone: z.string().trim().max(20).default(""),
  whatsapp: z.string().trim().max(20).default(""),
  email: z.string().trim().email("E-mail inválido").max(255),
  responsavel: z.string().trim().min(2, "Informe o responsável").max(120),
  cidade: z.string().trim().min(2, "Informe a cidade").max(80),
  estado: z.string().trim().length(2, "UF com 2 letras"),
  status: z.enum(["ativa", "suspensa", "bloqueada"]),
  limiteReais: z.coerce.number().min(0, "Valor inválido"),
  prazoPadraoDias: z.coerce.number().int().min(1, "Mínimo 1 dia").max(365),
  observacoes: z.string().trim().max(500).default(""),
});

type FormValues = z.input<typeof schema>;

function EmpresasPage() {
  const hydrated = useHydrated();
  const { data: empresas } = useEmpresas();
  const createMutation = useCreateEmpresa();
  const updateMutation = useUpdateEmpresa();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      razaoSocial: "",
      nomeFantasia: "",
      cnpj: "",
      inscricaoEstadual: "",
      telefone: "",
      whatsapp: "",
      email: "",
      responsavel: "",
      cidade: "",
      estado: "",
      status: "ativa",
      limiteReais: 0,
      prazoPadraoDias: 30,
      observacoes: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const parsed = schema.parse(values);
    const payload = {
      razaoSocial: parsed.razaoSocial,
      nomeFantasia: parsed.nomeFantasia,
      cnpj: parsed.cnpj,
      inscricaoEstadual: parsed.inscricaoEstadual,
      telefone: parsed.telefone,
      whatsapp: parsed.whatsapp,
      email: parsed.email,
      responsavel: parsed.responsavel,
      cidade: parsed.cidade,
      estado: parsed.estado.toUpperCase(),
      status: parsed.status,
      limiteCentavos: Math.round(parsed.limiteReais * 100),
      prazoPadraoDias: parsed.prazoPadraoDias,
      observacoes: parsed.observacoes,
    };

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, input: payload },
        {
          onSuccess: () => {
            toast.success("Empresa atualizada com sucesso.");
            form.reset();
            setOpen(false);
            setEditingId(null);
          },
          onError: () => toast.error("Não foi possível atualizar a empresa."),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Empresa cadastrada com sucesso.");
          form.reset();
          setOpen(false);
        },
        onError: () => toast.error("Não foi possível salvar a empresa."),
      });
    }
  });

  const handleEdit = (empresa: any) => {
    setEditingId(empresa.id);
    form.reset({
      razaoSocial: empresa.razaoSocial,
      nomeFantasia: empresa.nomeFantasia,
      cnpj: empresa.cnpj,
      inscricaoEstadual: empresa.inscricaoEstadual || "",
      telefone: empresa.telefone || "",
      whatsapp: empresa.whatsapp || "",
      email: empresa.email,
      responsavel: empresa.responsavel,
      cidade: empresa.cidade,
      estado: empresa.estado,
      status: empresa.status,
      limiteReais: empresa.limiteCentavos / 100,
      prazoPadraoDias: empresa.prazoPadraoDias,
      observacoes: empresa.observacoes || "",
    });
    setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingId(null);
      form.reset();
    }
  };

  return (
    <AppShell
      title="Empresas parceiras"
      description="Cadastro completo, limites financeiros e status de crédito dos parceiros."
      actions={
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Nova empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar empresa" : "Cadastrar empresa"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
                <TextField control={form.control} name="razaoSocial" label="Razão social" />
                <TextField control={form.control} name="nomeFantasia" label="Nome fantasia" />
                <TextField control={form.control} name="cnpj" label="CNPJ" />
                <TextField
                  control={form.control}
                  name="inscricaoEstadual"
                  label="Inscrição estadual"
                />
                <TextField control={form.control} name="telefone" label="Telefone" />
                <TextField control={form.control} name="whatsapp" label="WhatsApp" />
                <TextField control={form.control} name="email" label="E-mail" type="email" />
                <TextField control={form.control} name="responsavel" label="Responsável" />
                <TextField control={form.control} name="cidade" label="Cidade" />
                <TextField control={form.control} name="estado" label="UF" />
                <TextField
                  control={form.control}
                  name="limiteReais"
                  label="Limite financeiro (R$)"
                  type="number"
                />
                <TextField
                  control={form.control}
                  name="prazoPadraoDias"
                  label="Prazo padrão (dias)"
                  type="number"
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ativa">Ativa</SelectItem>
                          <SelectItem value="suspensa">Suspensa</SelectItem>
                          <SelectItem value="bloqueada">Bloqueada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="sm:col-span-2">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editingId ? "Atualizar empresa" : "Salvar empresa"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      }
    >
      {!hydrated || !empresas ? (
        <LoadingGrid />
      ) : empresas.length === 0 ? (
        <EmptyState
          title="Nenhuma empresa cadastrada"
          description="Cadastre o primeiro parceiro para começar a registrar empréstimos."
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                   <TableHead>Empresa</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Cidade / UF</TableHead>
                  <TableHead className="text-right">Limite</TableHead>
                  <TableHead className="text-right">Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresas.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell>
                      <p className="font-medium">{empresa.nomeFantasia}</p>
                      <p className="text-muted-foreground text-xs">{empresa.razaoSocial}</p>
                    </TableCell>
                    <TableCell className="text-sm">{empresa.cnpj}</TableCell>
                    <TableCell className="text-sm">{empresa.responsavel}</TableCell>
                    <TableCell className="text-sm">
                      {empresa.cidade} / {empresa.estado}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(empresa.limiteCentavos)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {empresa.prazoPadraoDias} dias
                    </TableCell>
                     <TableCell>
                      <EmpresaStatusBadge status={empresa.status} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(empresa)}>
                        <Edit className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}

interface TextFieldProps {
  readonly control: ReturnType<typeof useForm<FormValues>>["control"];
  readonly name: keyof FormValues;
  readonly label: string;
  readonly type?: string;
}

function TextField({ control, name, label, type = "text" }: TextFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} {...field} value={String(field.value ?? "")} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
