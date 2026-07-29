import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { z } from "zod";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, LoadingGrid } from "@/components/layout/states";
import { Badge } from "@/components/ui/badge";
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
  useDevolucoes,
  useEmprestimos,
  useProdutos,
  useRegistrarDevolucao,
} from "@/hooks/use-intermat";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatDate } from "@/lib/format";

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

const schema = z.object({
  emprestimoId: z.string().min(1, "Selecione o empréstimo"),
  tipo: z.enum(["total", "parcial", "troca", "avaria", "perda"]),
  quantidade: z.coerce.number().int().min(1, "Quantidade mínima 1"),
  responsavel: z.string().trim().min(2, "Informe o responsável").max(120),
  observacoes: z.string().trim().max(500).default(""),
});

type FormValues = z.input<typeof schema>;

const TIPO_LABEL: Record<z.infer<typeof schema>["tipo"], string> = {
  total: "Devolução total",
  parcial: "Devolução parcial",
  troca: "Troca de produto",
  avaria: "Avaria registrada",
  perda: "Perda (débito financeiro)",
};

function DevolucoesPage() {
  const hydrated = useHydrated();
  const { data: devolucoes } = useDevolucoes();
  const { data: emprestimos } = useEmprestimos();
  const { data: produtos } = useProdutos();
  const mutation = useRegistrarDevolucao();
  const [open, setOpen] = useState(false);

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
    const parsed = schema.parse(values);
    const loan = emprestimos?.find((item) => item.id === parsed.emprestimoId);
    const pendente = loan ? loan.quantidade - loan.quantidadeDevolvida : 0;
    if (loan && parsed.quantidade > pendente) {
      toast.error(`Quantidade acima do pendente (${pendente}).`);
      return;
    }

    mutation.mutate(
      {
        emprestimoId: parsed.emprestimoId,
        tipo: parsed.tipo,
        quantidade: parsed.quantidade,
        responsavel: parsed.responsavel,
        observacoes: parsed.observacoes,
      },
      {
        onSuccess: () => {
          toast.success("Ocorrência registrada e saldo atualizado.");
          form.reset({ ...form.getValues(), quantidade: 1, observacoes: "" });
          setOpen(false);
        },
        onError: () => toast.error("Não foi possível registrar a devolução."),
      },
    );
  });

  const abertos = (emprestimos ?? []).filter((loan) => loan.status !== "devolvido");

  return (
    <AppShell
      title="Devoluções"
      description="Total, parcial, troca, avaria ou perda — com atualização automática de estoque e saldo."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Undo2 className="size-4" /> Registrar devolução
            </Button>
          </DialogTrigger>
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
                              {loan.numero} · pendente{" "}
                              {loan.quantidade - loan.quantidadeDevolvida}
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
                <FormField
                  control={form.control}
                  name="quantidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={String(field.value ?? "")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="responsavel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável</FormLabel>
                      <FormControl>
                        <Input {...field} value={String(field.value ?? "")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
      }
    >
      {!hydrated || !devolucoes ? (
        <LoadingGrid />
      ) : devolucoes.length === 0 ? (
        <EmptyState
          title="Nenhuma devolução registrada"
          description="As ocorrências de retorno aparecerão aqui com histórico completo."
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Empréstimo</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devolucoes.map((devolucao) => {
                  const loan = emprestimos?.find((item) => item.id === devolucao.emprestimoId);
                  const produto = produtos?.find((item) => item.id === loan?.produtoId);
                  return (
                    <TableRow key={devolucao.id}>
                      <TableCell className="text-sm">{formatDate(devolucao.data)}</TableCell>
                      <TableCell className="font-mono text-xs">{loan?.numero ?? "—"}</TableCell>
                      <TableCell className="text-sm">{produto?.descricao ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{TIPO_LABEL[devolucao.tipo]}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{devolucao.quantidade}</TableCell>
                      <TableCell className="text-sm">{devolucao.responsavel}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {devolucao.observacoes || "—"}
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
