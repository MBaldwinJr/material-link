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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEmprestimos, useRegistrarDevolucao } from "@/hooks/use-intermat";
import { FormNumberField, FormTextField } from "@/features/shared/components/form-fields";

const schema = z.object({
  emprestimoId: z.string().min(1, "Selecione o empréstimo"),
  tipo: z.enum(["total", "parcial", "troca", "avaria", "perda"]),
  quantidade: z.coerce.number().int().min(1, "Quantidade mínima 1"),
  responsavel: z.string().trim().min(2, "Informe o responsável").max(120),
  observacoes: z.string().trim().max(500),
});

type FormValues = z.infer<typeof schema>;

const TIPO_LABEL: Record<z.infer<typeof schema>["tipo"], string> = {
  total: "Devolução total",
  parcial: "Devolução parcial",
  troca: "Troca de produto",
  avaria: "Avaria registrada",
  perda: "Perda (débito financeiro)",
};

interface DevolucaoFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function DevolucaoFormDialog({ open, onOpenChange }: DevolucaoFormDialogProps) {
  const { data: emprestimos } = useEmprestimos();
  const mutation = useRegistrarDevolucao();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      emprestimoId: "",
      tipo: "parcial",
      quantidade: 1,
      responsavel: "",
      observacoes: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const loan = emprestimos?.find((item) => item.id === values.emprestimoId);
    const pendente = loan ? loan.quantidade - loan.quantidadeDevolvida : 0;
    
    if (loan && values.quantidade > pendente) {
      toast.error(`Quantidade acima do pendente (${pendente}).`);
      return;
    }

    mutation.mutate(values, {
      onSuccess: () => {
        toast.success("Ocorrência registrada e saldo atualizado.");
        form.reset({ ...form.getValues(), quantidade: 1, observacoes: "" });
        onOpenChange(false);
      },
      onError: () => toast.error("Não foi possível registrar a devolução."),
    });
  });

  const abertos = (emprestimos ?? []).filter((loan) => loan.status !== "devolvido");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar ocorrência de retorno</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4">
            <FormField
              control={form.control}
              name="emprestimoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empréstimo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {abertos.map((loan) => (
                        <SelectItem key={loan.id} value={loan.id}>
                          {loan.numero} · pendente {loan.quantidade - loan.quantidadeDevolvida}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(TIPO_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormNumberField control={form.control} name="quantidade" label="Quantidade" />
            <FormTextField control={form.control} name="responsavel" label="Responsável" />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Registrando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
