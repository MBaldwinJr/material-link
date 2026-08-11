import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateEmprestimo, useEmpresas, useOperacional, useProdutos } from "@/hooks/use-intermat";
import { FormTextField, FormNumberField, FormDateField } from "@/features/shared/components/form-fields";
import { useMemo, useState, useEffect } from "react";
import { Search, Package, Truck, Info, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Separator } from "@/components/ui/separator";
const schema = z.object({
    empresaId: z.string().min(1, "Selecione a empresa"),
    produtoId: z.string().min(1, "Selecione o produto"),
    quantidade: z.coerce.number().int().min(1, "Quantidade mínima 1"),
    valorUnitarioReais: z.coerce.number().min(0, "Valor inválido"),
    data: z.string().min(1, "Informe a data"),
    prazoDevolucao: z.string().min(1, "Informe o prazo"),
    responsavel: z.string().trim().min(2, "Informe o responsável").max(120),
    motorista: z.string().trim().max(120),
    veiculo: z.string().trim().max(120),
    observacoes: z.string().trim().max(500),
});
function today() {
    return new Date().toISOString().slice(0, 10);
}
export function EmprestimoFormDialog({ open, onOpenChange }) {
    const { data: empresas, isLoading: loadingEmpresas } = useEmpresas();
    const { data: produtos, isLoading: loadingProdutos } = useProdutos();
    const { data: operacional, isLoading: loadingOperacional } = useOperacional();
    const createMutation = useCreateEmprestimo();
    const [produtoBusca, setProdutoBusca] = useState("");
    const form = useForm({
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
    const selectedProdutoId = form.watch("produtoId");
    const selectedProduto = useMemo(() => produtos?.find(p => p.id === selectedProdutoId), [produtos, selectedProdutoId]);
    const totalEmprestimo = useMemo(() => {
        const qtd = form.watch("quantidade");
        const valor = form.watch("valorUnitarioReais");
        return (qtd || 0) * (valor || 0);
    }, [form.watch("quantidade"), form.watch("valorUnitarioReais")]);
    useEffect(() => {
        const empresaId = form.watch("empresaId");
        if (empresaId && empresas) {
            const empresa = empresas.find(e => e.id === empresaId);
            if (empresa) {
                const date = new Date(form.getValues("data") || today());
                date.setDate(date.getDate() + (empresa.prazoPadraoDias || 7));
                form.setValue("prazoDevolucao", date.toISOString().slice(0, 10));
            }
        }
    }, [form.watch("empresaId"), empresas]);
    const produtosFiltrados = useMemo(() => {
        const termo = produtoBusca.trim().toLowerCase();
        if (!termo)
            return (produtos ?? []).slice(0, 10);
        return (produtos ?? []).filter((produto) => produto.descricao.toLowerCase().includes(termo) ||
            produto.codigo.toLowerCase().includes(termo) ||
            produto.codigoBarras?.toLowerCase().includes(termo)).slice(0, 50);
    }, [produtos, produtoBusca]);
    const onSubmit = form.handleSubmit((values) => {
        if (selectedProduto && selectedProduto.estoqueAtual < values.quantidade) {
            toast.error(`Estoque insuficiente. Saldo atual: ${selectedProduto.estoqueAtual} ${selectedProduto.unidade}`);
            return;
        }
        createMutation.mutate({
            ...values,
            valorUnitarioCentavos: Math.round(values.valorUnitarioReais * 100),
            data: new Date(values.data).toISOString(),
            prazoDevolucao: new Date(values.prazoDevolucao).toISOString(),
        }, {
            onSuccess: () => {
                toast.success("Empréstimo registrado com sucesso!");
                form.reset();
                setProdutoBusca("");
                onOpenChange(false);
            },
            onError: (err) => {
                console.error(err);
                toast.error("Erro ao registrar empréstimo. Verifique os dados.");
            }
        });
    });
    const isLoading = loadingEmpresas || loadingProdutos || loadingOperacional;
    return (<Dialog open={open} onOpenChange={(val) => {
            onOpenChange(val);
            if (!val) {
                setProdutoBusca("");
                form.reset();
            }
        }}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-3xl p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Package className="size-6 text-primary"/>
            Novo Empréstimo de Material
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="p-6 pt-2 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <Info className="size-4"/>
                Dados do Empréstimo
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="empresaId" render={({ field }) => (<FormItem>
                      <FormLabel>Empresa Parceira</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione a empresa"/>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingEmpresas ? (<div className="flex items-center justify-center p-2"><Loader2 className="animate-spin size-4 mr-2"/> Carregando...</div>) : (empresas ?? []).map((empresa) => (<SelectItem key={empresa.id} value={empresa.id}>
                              {empresa.nomeFantasia}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>)}/>

                <FormTextField control={form.control} name="responsavel" label="Responsável Interno" placeholder="Quem está liberando?"/>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <Search className="size-4"/>
                Seleção de Material
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="produto-busca" className="text-sm font-medium">
                    Filtrar Material
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"/>
                    <Input id="produto-busca" placeholder="Código, EAN ou descrição..." className="pl-9" value={produtoBusca} onChange={(e) => setProdutoBusca(e.target.value)}/>
                  </div>
                </div>

                <FormField control={form.control} name="produtoId" render={({ field }) => (<FormItem>
                      <FormLabel>Produto</FormLabel>
                      <Select onValueChange={(value) => {
                field.onChange(value);
                const produto = produtos?.find((p) => p.id === value);
                if (produto) {
                    form.setValue("valorUnitarioReais", produto.vendaCentavos / 100);
                }
            }} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione o produto"/>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          {produtosFiltrados.length === 0 ? (<div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                              <AlertCircle className="size-4"/>
                              Nenhum produto encontrado.
                            </div>) : (produtosFiltrados.map((produto) => (<SelectItem key={produto.id} value={produto.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{produto.codigo} · {produto.descricao}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    Estoque: {produto.estoqueAtual} {produto.unidade} | {formatCurrency(produto.vendaCentavos)}
                                  </span>
                                </div>
                              </SelectItem>)))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>)}/>
              </div>

              {selectedProduto && (<div className="bg-accent/50 rounded-lg p-4 border border-border/50 flex flex-wrap gap-4 items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Estoque Atual</div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-2xl font-bold", selectedProduto.estoqueAtual <= selectedProduto.estoqueMinimo ? "text-destructive" : "text-foreground")}>
                        {selectedProduto.estoqueAtual} {selectedProduto.unidade}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <FormNumberField control={form.control} name="quantidade" label="Quantidade"/>
                    <FormNumberField control={form.control} name="valorUnitarioReais" label="Valor Unit. (R$)" step="0.01"/>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Total</div>
                    <div className="text-2xl font-black text-primary">
                      {formatCurrency(Math.round(totalEmprestimo * 100))}
                    </div>
                  </div>
                </div>)}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <Truck className="size-4"/>
                Logística e Prazos
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormDateField control={form.control} name="data" label="Data Saída"/>
                <FormDateField control={form.control} name="prazoDevolucao" label="Previsão Retorno"/>

                <FormField control={form.control} name="motorista" render={({ field }) => (<FormItem>
                      <FormLabel>Motorista</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione"/>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(operacional?.motoristas ?? []).map((m) => (<SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>))}
                          <SelectItem value="cliente">Retirada pelo Cliente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>)}/>

                <FormField control={form.control} name="veiculo" render={({ field }) => (<FormItem>
                      <FormLabel>Veículo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione"/>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(operacional?.veiculos ?? []).map((v) => (<SelectItem key={v.id} value={`${v.modelo} ${v.placa}`}>
                              {v.modelo} · {v.placa}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>)}/>
              </div>
            </div>

            <FormField control={form.control} name="observacoes" render={({ field }) => (<FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Informações adicionais sobre o empréstimo..." rows={2} className="resize-none" {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>

            <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6 border-t">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" className="min-w-[180px] gap-2" disabled={createMutation.isPending || isLoading}>
                {createMutation.isPending ? (<>
                    <Loader2 className="animate-spin size-4"/>
                    Salvando...
                  </>) : (<>
                    <CheckCircle2 className="size-4"/>
                    Confirmar Saída
                  </>)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>);
}
