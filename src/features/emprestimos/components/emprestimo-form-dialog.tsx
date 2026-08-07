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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateEmprestimo, useEmpresas, useOperacional, useProdutos } from "@/hooks/use-intermat";
import { FormTextField, FormNumberField, FormDateField } from "@/features/shared/components/form-fields";
import { useMemo, useState } from "react";

const schema = z.object({
  empresaId: z.string().min(1, "Selecione a empresa"),
  produtoId: z.string().min(1, "Selecione o produto"),
  quantidade: z.coerce.number().int().min(1, "Quantidade mínima 1"),
  valorUnitarioReais: z.coerce.number().min(0, "Valor inválido"),
  data: z.string().min(1, "Informe a data"),
  prazoDevolucao: z.string().min(1, "Informe o prazo"),
  responsavel: z.string().trim().min(2, "Informe o responsável").max(120),
  motorista: z.string().trim().max(120).default(""),
  veiculo: z.string().trim().max(120).default(""),
  observacoes: z.string().trim().max(500).default(""),
});

type FormValues = z.infer<typeof schema>;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface EmprestimoFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function EmprestimoFormDialog({ open, onOpenChange }: EmprestimoFormDialogProps) {
  const { data: empresas } = useEmpresas();
  const { data: produtos } = useProdutos();
  const { data: operacional } = useOperacional();
  const createMutation = useCreateEmprestimo();
  const [produtoBusca, setProdutoBusca] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      empresaId: "",
      produtoId: "",
      quantidade: 1,
      valorUnitarioReais: 0,
      data: today(),
      prazoDevolucao: today(),
      responsavel: "",
      motorista: "",
      veiculo: "",
      observacoes: "",
    },
  });

  const produtosFiltrados = useMemo(() => {
    const termo = produtoBusca.trim().toLowerCase();
    if (!termo) return produtos ?? [];
    return (produtos ?? []).filter(
      (produto) =>
        produto.descricao.toLowerCase().includes(termo) ||
        produto.codigo.toLowerCase().includes(termo)
    );
  }, [produtos, produtoBusca]);

  const onSubmit = form.handleSubmit((values) => {
    const produto = produtos?.find((item) => item.id === values.produtoId);
    if (produto && produto.estoqueAtual < values.quantidade) {
      toast.error("Estoque insuficiente para este empréstimo.");
      return;
    }

    createMutation.mutate(
      {
        ...values,
        valorUnitarioCentavos: Math.round(values.valorUnitarioReais * 100),
        data: new Date(values.data).toISOString(),
        prazoDevolucao: new Date(values.prazoDevolucao).toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Empréstimo registrado. Estoque atualizado automaticamente.");
          form.reset();
          setProdutoBusca("");
          onOpenChange(false);
        },
        onError: () => toast.error("Não foi possível registrar o empréstimo."),
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setProdutoBusca("");
    }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar empréstimo</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="empresaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(empresas ?? []).map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          {empresa.nomeFantasia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="produto-busca" className="text-sm leading-none font-medium">
                Buscar produto
              </label>
              <Input
                id="produto-busca"
                placeholder="Código ou parte da descrição..."
                value={produtoBusca}
                onChange={(e) => setProdutoBusca(e.target.value)}
              />
            </div>

            <FormField
              control={form.control}
              name="produtoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      const produto = produtos?.find((p) => p.id === value);
                      if (produto) {
                        form.setValue("valorUnitarioReais", produto.vendaCentavos / 100);
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {produtosFiltrados.length === 0 ? (
                        <div className="text-muted-foreground px-2 py-1.5 text-sm">
                          Nenhum produto encontrado
                        </div>
                      ) : (
                        produtosFiltrados.slice(0, 100).map((produto) => (
                          <SelectItem key={produto.id} value={produto.id}>
                            {produto.codigo} · {produto.descricao} ({produto.estoqueAtual} {produto.unidade})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormNumberField control={form.control} name="quantidade" label="Quantidade" />
            <FormNumberField control={form.control} name="valorUnitarioReais" label="Valor unitário (R$)" step="0.01" />
            <FormDateField control={form.control} name="data" label="Data do empréstimo" />
            <FormDateField control={form.control} name="prazoDevolucao" label="Prazo de devolução" />
            <FormTextField control={form.control} name="responsavel" label="Responsável interno" />

            <FormField
              control={form.control}
              name="motorista"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motorista</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(operacional?.motoristas ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="veiculo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Veículo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(operacional?.veiculos ?? []).map((v) => (
                        <SelectItem key={v.id} value={`${v.modelo} ${v.placa}`}>
                          {v.modelo} · {v.placa}
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Registrando..." : "Confirmar empréstimo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
