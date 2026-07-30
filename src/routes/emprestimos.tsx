import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { z } from "zod";

import { AppShell } from "@/components/layout/app-shell";
import { EmprestimoStatusBadge } from "@/components/layout/status-badges";
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
import {
  useCreateEmprestimo,
  useEmpresas,
  useEmprestimos,
  useOperacional,
  useProdutos,
} from "@/hooks/use-intermat";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatCurrency, formatDate } from "@/lib/format";
import { saldoAbertoCentavos } from "@/services/emprestimo-service";

export const Route = createFileRoute("/emprestimos")({
  head: () => ({
    meta: [
      { title: "Empréstimos de materiais | InterMat" },
      {
        name: "description",
        content:
          "Registre empréstimos entre empresas com baixa automática de estoque, prazo e logística.",
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

type FormValues = z.input<typeof schema>;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function EmprestimosPage() {
  const hydrated = useHydrated();
  const { data: emprestimos } = useEmprestimos();
  const { data: empresas } = useEmpresas();
  const { data: produtos } = useProdutos();
  const { data: operacional } = useOperacional();
  const createMutation = useCreateEmprestimo();
  const [open, setOpen] = useState(false);
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
      (produto: { readonly descricao: string; readonly codigo: string }) =>
        produto.descricao.toLowerCase().includes(termo) ||
        produto.codigo.toLowerCase().includes(termo),
    );
  }, [produtos, produtoBusca]);

  const onSubmit = form.handleSubmit((values) => {
    const parsed = schema.parse(values);
    const produto = produtos?.find((item) => item.id === parsed.produtoId);
    if (produto && produto.estoqueAtual < parsed.quantidade) {
      toast.error("Estoque insuficiente para este empréstimo.");
      return;
    }

    createMutation.mutate(
      {
        empresaId: parsed.empresaId,
        produtoId: parsed.produtoId,
        quantidade: parsed.quantidade,
        valorUnitarioCentavos: Math.round(parsed.valorUnitarioReais * 100),
        data: new Date(parsed.data).toISOString(),
        prazoDevolucao: new Date(parsed.prazoDevolucao).toISOString(),
        responsavel: parsed.responsavel,
        motorista: parsed.motorista,
        veiculo: parsed.veiculo,
        observacoes: parsed.observacoes,
      },
      {
        onSuccess: () => {
          toast.success("Empréstimo registrado. Estoque atualizado automaticamente.");
          form.reset({ ...form.getValues(), quantidade: 1, observacoes: "" });
          setProdutoBusca("");
          setOpen(false);
        },
        onError: () => toast.error("Não foi possível registrar o empréstimo."),
      },
    );
  });

  return (
    <AppShell
      title="Empréstimos"
      description="Cada confirmação reduz o estoque, gera movimentação e atualiza o saldo da empresa."
      actions={
        <Dialog open={open} onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setProdutoBusca("");
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Novo empréstimo
            </Button>
          </DialogTrigger>
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
                <FormItem className="flex flex-col gap-1">
                  <FormLabel>Produto</FormLabel>
                  <Input
                    placeholder="Buscar por código ou descrição..."
                    value={produtoBusca}
                    onChange={(event) => setProdutoBusca(event.target.value)}
                    className="mb-1"
                    aria-label="Buscar produto por código ou descrição"
                  />
                  <FormField
                    control={form.control}
                    name="produtoId"
                    render={({ field }) => (
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          const produto = produtos?.find((item) => item.id === value);
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
                          {produtosFiltrados.map((produto) => (
                            <SelectItem key={produto.id} value={produto.id}>
                              {produto.codigo} · {produto.descricao} ({produto.estoqueAtual} {produto.unidade})
                            </SelectItem>
                          ))}
                          {produtosFiltrados.length === 0 && (
                            <SelectItem value="" disabled>
                              Nenhum produto encontrado
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FormMessage />
                </FormItem>
                <NumberField control={form.control} name="quantidade" label="Quantidade" />
                <NumberField
                  control={form.control}
                  name="valorUnitarioReais"
                  label="Valor unitário (R$)"
                />
                <DateField control={form.control} name="data" label="Data do empréstimo" />
                <DateField
                  control={form.control}
                  name="prazoDevolucao"
                  label="Prazo de devolução"
                />
                <TextInputField
                  control={form.control}
                  name="responsavel"
                  label="Responsável interno"
                />
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
                          {(operacional?.motoristas ?? []).map((motorista) => (
                            <SelectItem key={motorista.id} value={motorista.nome}>
                              {motorista.nome}
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
                          {(operacional?.veiculos ?? []).map((veiculo) => (
                            <SelectItem
                              key={veiculo.id}
                              value={`${veiculo.modelo} ${veiculo.placa}`}
                            >
                              {veiculo.modelo} · {veiculo.placa}
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
      }
    >
      {!hydrated || !emprestimos ? (
        <LoadingGrid />
      ) : emprestimos.length === 0 ? (
        <EmptyState
          title="Nenhum empréstimo registrado"
          description="Registre o primeiro empréstimo para acompanhar prazos e saldo em aberto."
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd. / Devolvida</TableHead>
                  <TableHead className="text-right">Saldo aberto</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Logística</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emprestimos.map((loan) => {
                  const empresa = empresas?.find((item) => item.id === loan.empresaId);
                  const produto = produtos?.find((item) => item.id === loan.produtoId);
                  return (
                    <TableRow key={loan.id}>
                      <TableCell className="font-mono text-xs">{loan.numero}</TableCell>
                      <TableCell className="text-sm">{empresa?.nomeFantasia ?? "—"}</TableCell>
                      <TableCell className="text-sm">{produto?.descricao ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm">
                        {loan.quantidade} / {loan.quantidadeDevolvida}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(saldoAbertoCentavos(loan))}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(loan.prazoDevolucao)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {loan.motorista || "—"}
                        <br />
                        {loan.veiculo || "—"}
                      </TableCell>
                      <TableCell>
                        <EmprestimoStatusBadge status={loan.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}

type Control = ReturnType<typeof useForm<FormValues>>["control"];

function TextInputField({
  control,
  name,
  label,
}: {
  readonly control: Control;
  readonly name: keyof FormValues;
  readonly label: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} value={String(field.value ?? "")} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function NumberField({
  control,
  name,
  label,
}: {
  readonly control: Control;
  readonly name: keyof FormValues;
  readonly label: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type="number" step="0.01" {...field} value={String(field.value ?? "")} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function DateField({
  control,
  name,
  label,
}: {
  readonly control: Control;
  readonly name: keyof FormValues;
  readonly label: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type="date" {...field} value={String(field.value ?? "")} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
