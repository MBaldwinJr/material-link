import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useEmprestimos, useRegistrarDevolucao } from "@/hooks/use-intermat";
import { FormNumberField, FormTextField } from "@/features/shared/components/form-fields";
import { useMemo, useState } from "react";
import { ArrowLeftRight, ClipboardCheck, Search, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
const schema = z.object({
    emprestimoId: z.string().min(1, "Selecione o empréstimo"),
    tipo: z.enum(["total", "parcial", "troca", "avaria", "perda"]),
    quantidade: z.coerce.number().int().min(1, "Quantidade mínima 1"),
    responsavel: z.string().trim().min(2, "Informe o responsável").max(120),
    observacoes: z.string().trim().max(500),
});
const TIPO_LABEL = {
    total: { label: "Devolução Total", description: "O item retorna integralmente ao estoque.", color: "bg-green-500" },
    parcial: { label: "Devolução Parcial", description: "Retorno de apenas uma parte do saldo pendente.", color: "bg-blue-500" },
    troca: { label: "Troca", description: "Substituição de um material por outro equivalente.", color: "bg-orange-500" },
    avaria: { label: "Avaria", description: "Material retornou com danos que impedem o uso.", color: "bg-yellow-500" },
    perda: { label: "Perda / Extravio", description: "Item não retornará. Gera débito financeiro.", color: "bg-red-500" },
};
export function DevolucaoFormDialog({ open, onOpenChange }) {
    const { data: emprestimos, isLoading: loadingEmprestimos } = useEmprestimos();
    const mutation = useRegistrarDevolucao();
    const [busca, setBusca] = useState("");
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            emprestimoId: "",
            tipo: "parcial",
            quantidade: 1,
            responsavel: "",
            observacoes: "",
        },
    });
    const selectedLoanId = form.watch("emprestimoId");
    const selectedLoan = useMemo(() => emprestimos?.find(l => l.id === selectedLoanId), [emprestimos, selectedLoanId]);
    const pendente = selectedLoan ? selectedLoan.quantidade - selectedLoan.quantidadeDevolvida : 0;
    const abertos = useMemo(() => {
        const list = (emprestimos ?? []).filter((loan) => loan.status !== "devolvido");
        const termo = busca.trim().toLowerCase();
        if (!termo)
            return list.slice(0, 20);
        return list.filter(l => l.numero.toLowerCase().includes(termo) ||
            l.responsavel.toLowerCase().includes(termo)).slice(0, 50);
    }, [emprestimos, busca]);
    const onSubmit = form.handleSubmit((values) => {
        if (selectedLoan && values.quantidade > pendente) {
            toast.error(`Quantidade acima do pendente (${pendente}).`);
            return;
        }
        mutation.mutate(values, {
            onSuccess: () => {
                toast.success("Ocorrência registrada com sucesso.");
                form.reset({ ...form.getValues(), quantidade: 1, observacoes: "" });
                setBusca("");
                onOpenChange(false);
            },
            onError: () => toast.error("Não foi possível registrar o retorno."),
        });
    });
    const tipoSelecionado = form.watch("tipo");
    return (<Dialog open={open} onOpenChange={(val) => {
            onOpenChange(val);
            if (!val) {
                setBusca("");
                form.reset();
            }
        }}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-2xl p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <ArrowLeftRight className="size-6 text-primary"/>
            Concluir / Registrar Retorno
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="p-6 pt-2 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <Search className="size-4"/>
                Localizar Empréstimo
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="busca-emprestimo" className="text-sm font-medium">
                    Filtrar por Nº ou Responsável
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"/>
                    <Input id="busca-emprestimo" placeholder="Ex: EMP-001..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)}/>
                  </div>
                </div>

                <FormField control={form.control} name="emprestimoId" render={({ field }) => (<FormItem>
                      <FormLabel>Empréstimo Ativo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione o empréstimo"/>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingEmprestimos ? (<div className="flex items-center justify-center p-2"><Loader2 className="animate-spin size-4 mr-2"/> Carregando...</div>) : abertos.length === 0 ? (<div className="p-4 text-sm text-muted-foreground">Nenhum empréstimo em aberto encontrado.</div>) : abertos.map((loan) => (<SelectItem key={loan.id} value={loan.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{loan.numero}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  Pendente: {loan.quantidade - loan.quantidadeDevolvida} un. | {loan.responsavel}
                                </span>
                              </div>
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>)}/>
              </div>

              {selectedLoan && (<div className="bg-muted/50 rounded-lg p-4 border border-border flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Saldo Pendente</div>
                    <div className="text-2xl font-bold text-foreground">
                      {pendente} unidades
                    </div>
                  </div>
                  <Badge variant="outline" className="h-fit">
                    Original: {selectedLoan.quantidade}
                  </Badge>
                </div>)}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <ClipboardCheck className="size-4"/>
                Detalhes da Ocorrência
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="tipo" render={({ field }) => (<FormItem>
                      <FormLabel>Tipo de Retorno</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(TIPO_LABEL).map(([value, info]) => (<SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                <div className={cn("size-2 rounded-full", info.color)}/>
                                {info.label}
                              </div>
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-[10px]">
                        {TIPO_LABEL[tipoSelecionado].description}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>)}/>

                <FormNumberField control={form.control} name="quantidade" label="Quantidade a Baixar"/>
              </div>

              <FormTextField control={form.control} name="responsavel" label="Responsável pelo Recebimento" placeholder="Quem conferiu o retorno?"/>

              <FormField control={form.control} name="observacoes" render={({ field }) => (<FormItem>
                    <FormLabel>Notas e Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Relate avarias, justificativas de perda ou detalhes da troca..." rows={3} className="resize-none" {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>
            </div>

            <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6 border-t">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" className="min-w-[180px] gap-2" disabled={mutation.isPending || !selectedLoan}>
                {mutation.isPending ? (<>
                    <Loader2 className="animate-spin size-4"/>
                    Processando...
                  </>) : (<>
                    <CheckCircle2 className="size-4"/>
                    Confirmar Retorno
                  </>)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>);
}
