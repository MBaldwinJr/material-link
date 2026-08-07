import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateEmpresa, useUpdateEmpresa } from "@/hooks/use-intermat";
import { FormTextField } from "@/features/shared/components/form-fields";
import { Empresa } from "@/types/domain";

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

type FormValues = z.infer<typeof schema>;

interface EmpresaFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly empresa?: Empresa | null;
}

export function EmpresaFormDialog({ open, onOpenChange, empresa }: EmpresaFormDialogProps) {
  const createMutation = useCreateEmpresa();
  const updateMutation = useUpdateEmpresa();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: empresa ? {
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
    } : {
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
    const payload = {
      ...values,
      estado: values.estado.toUpperCase(),
      limiteCentavos: Math.round(values.limiteReais * 100),
    };

    if (empresa?.id) {
      updateMutation.mutate(
        { id: empresa.id, input: payload },
        {
          onSuccess: () => {
            toast.success("Empresa atualizada com sucesso.");
            onOpenChange(false);
          },
          onError: () => toast.error("Não foi possível atualizar a empresa."),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Empresa cadastrada com sucesso.");
          onOpenChange(false);
        },
        onError: () => toast.error("Não foi possível salvar a empresa."),
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{empresa ? "Editar empresa" : "Cadastrar empresa"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <FormTextField control={form.control} name="razaoSocial" label="Razão social" />
            <FormTextField control={form.control} name="nomeFantasia" label="Nome fantasia" />
            <FormTextField control={form.control} name="cnpj" label="CNPJ" />
            <FormTextField control={form.control} name="inscricaoEstadual" label="Inscrição estadual" />
            <FormTextField control={form.control} name="telefone" label="Telefone" />
            <FormTextField control={form.control} name="whatsapp" label="WhatsApp" />
            <FormTextField control={form.control} name="email" label="E-mail" type="email" />
            <FormTextField control={form.control} name="responsavel" label="Responsável" />
            <FormTextField control={form.control} name="cidade" label="Cidade" />
            <FormTextField control={form.control} name="estado" label="UF" />
            <FormTextField control={form.control} name="limiteReais" label="Limite financeiro (R$)" type="number" />
            <FormTextField control={form.control} name="prazoPadraoDias" label="Prazo padrão (dias)" type="number" />
            
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
                {createMutation.isPending || updateMutation.isPending ? "Salvando..." : empresa ? "Atualizar empresa" : "Salvar empresa"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
