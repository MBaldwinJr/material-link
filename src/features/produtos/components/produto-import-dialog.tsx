import { useCallback, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useImportProdutos } from "@/hooks/use-intermat";
import { formatCurrency } from "@/lib/format";
import {
  parseProdutoFile,
  type ProdutoImportResult,
} from "@/features/produtos/lib/produto-import";

const ACCEPTED = ".pdf,.csv,.xlsx,.xls,.txt";
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const PREVIEW_LIMIT = 8;

export function ProdutoImportDialog() {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ProdutoImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: importar, isPending } = useImportProdutos();

  const preview = useMemo(() => result?.rows.slice(0, PREVIEW_LIMIT) ?? [], [result]);

  const reset = useCallback(() => {
    setFileName(null);
    setResult(null);
    setParsing(false);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Arquivo muito grande", { description: "O limite é de 25 MB." });
      return;
    }
    setParsing(true);
    setFileName(file.name);
    try {
      setResult(await parseProdutoFile(file));
    } catch {
      setResult(null);
      toast.error("Não foi possível ler o arquivo", {
        description: "Use um relatório em PDF, CSV, XLS ou XLSX exportado do seu ERP.",
      });
    } finally {
      setParsing(false);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!result || result.rows.length === 0 || !fileName) return;
    const summary = await importar({ rows: result.rows, origem: fileName });
    toast.success("Relatório importado", {
      description: `${summary.criados} produtos criados e ${summary.atualizados} atualizados.`,
    });
    setOpen(false);
    reset();
  }, [fileName, importar, reset, result]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 size-4" aria-hidden="true" />
          Importar relatório do ERP
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar relatório do ERP</DialogTitle>
          <DialogDescription>
            Aceita PDF (Relatório Estoque Produto), CSV, XLS e XLSX. As colunas são reconhecidas automaticamente (código, descrição,
            marca, categoria, fornecedor, unidade, custo, venda, estoque, mínimo e localização).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label
            htmlFor="produto-import-file"
            className="border-border hover:bg-muted/40 flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition"
          >
            <FileSpreadsheet className="text-muted-foreground size-6" aria-hidden="true" />
            <span className="text-sm font-medium">
              {fileName ?? "Selecionar arquivo do relatório"}
            </span>
            <span className="text-muted-foreground text-xs">Tamanho máximo de 25 MB</span>
            <input
              ref={inputRef}
              id="produto-import-file"
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>

          {parsing ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Lendo relatório...
            </p>
          ) : null}

          {result && result.rows.length === 0 && !parsing ? (
            <Alert variant="destructive">
              <AlertTitle>Nenhum produto válido encontrado</AlertTitle>
              <AlertDescription>
                Verifique se o relatório possui uma coluna de descrição do produto.
              </AlertDescription>
            </Alert>
          ) : null}

          {result && result.rows.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm">
                <strong>{result.rows.length}</strong> produtos prontos para importar. Produtos com
                código já existente serão atualizados.
              </p>
              {result.ignoredColumns.length > 0 ? (
                <p className="text-muted-foreground text-xs">
                  Colunas ignoradas: {result.ignoredColumns.join(", ")}
                </p>
              ) : null}
              {result.errors.length > 0 ? (
                <Alert>
                  <AlertTitle>Avisos da leitura</AlertTitle>
                  <AlertDescription>{result.errors.slice(0, 3).join(" ")}</AlertDescription>
                </Alert>
              ) : null}
              <div className="max-h-64 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Venda</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row) => (
                      <TableRow key={`${row.codigo}-${row.descricao}`}>
                        <TableCell className="font-mono text-xs">{row.codigo}</TableCell>
                        <TableCell className="text-sm">{row.descricao}</TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(row.custoCentavos)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(row.vendaCentavos)}
                        </TableCell>
                        <TableCell className="text-right text-sm">{row.estoqueAtual}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || parsing || !result || result.rows.length === 0}
          >
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
            Importar {result?.rows.length ?? 0} produtos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
