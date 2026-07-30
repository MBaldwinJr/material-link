import type { Produto } from "@/types/domain";

export type ProdutoImportRow = Omit<Produto, "id">;

export interface ProdutoImportResult {
  readonly rows: readonly ProdutoImportRow[];
  readonly errors: readonly string[];
  readonly ignoredColumns: readonly string[];
}

const FIELD_ALIASES: Record<keyof ProdutoImportRow, readonly string[]> = {
  codigo: ["codigo", "cod", "sku", "referencia", "codigointerno", "codproduto"],
  codigoBarras: ["codigobarras", "ean", "gtin", "barras"],
  descricao: ["descricao", "produto", "nome", "descricaoproduto", "item"],
  marca: ["marca", "fabricante"],
  categoria: ["categoria", "grupo", "linha", "familia"],
  fornecedor: ["fornecedor", "supplier"],
  unidade: ["unidade", "un", "und", "unidademedida"],
  custoCentavos: ["custo", "precocusto", "valorcusto", "custounitario"],
  vendaCentavos: ["venda", "precovenda", "valorvenda", "preco"],
  estoqueAtual: ["estoque", "estoqueatual", "saldo", "quantidade", "qtd"],
  estoqueMinimo: ["estoqueminimo", "minimo", "estoquemin"],
  localizacao: ["localizacao", "local", "endereco", "prateleira", "deposito"],
};

const MONEY_FIELDS = new Set<keyof ProdutoImportRow>(["custoCentavos", "vendaCentavos"]);
const NUMBER_FIELDS = new Set<keyof ProdutoImportRow>(["estoqueAtual", "estoqueMinimo"]);

function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function resolveField(header: string): keyof ProdutoImportRow | undefined {
  const normalized = normalizeHeader(header);
  const entries = Object.entries(FIELD_ALIASES) as ReadonlyArray<
    [keyof ProdutoImportRow, readonly string[]]
  >;
  return entries.find(([, aliases]) => aliases.includes(normalized))?.[0];
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const cleaned = raw
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function buildRow(record: Record<string, unknown>): ProdutoImportRow {
  const draft: ProdutoImportRow = {
    codigo: "",
    codigoBarras: "",
    descricao: "",
    marca: "",
    categoria: "Importado",
    fornecedor: "",
    unidade: "UN",
    custoCentavos: 0,
    vendaCentavos: 0,
    estoqueAtual: 0,
    estoqueMinimo: 0,
    localizacao: "",
  };

  return Object.entries(record).reduce<ProdutoImportRow>((accumulator, [header, value]) => {
    const field = resolveField(header);
    if (!field) return accumulator;
    if (MONEY_FIELDS.has(field)) {
      return { ...accumulator, [field]: Math.round(toNumber(value) * 100) };
    }
    if (NUMBER_FIELDS.has(field)) {
      return { ...accumulator, [field]: Math.round(toNumber(value)) };
    }
    const text = toText(value);
    return text ? { ...accumulator, [field]: text } : accumulator;
  }, draft);
}

export function mapRecordsToProdutos(
  records: ReadonlyArray<Record<string, unknown>>,
): ProdutoImportResult {
  const headers = Object.keys(records[0] ?? {});
  const ignoredColumns = headers.filter((header) => !resolveField(header));
  const errors: string[] = [];
  const rows: ProdutoImportRow[] = [];

  records.forEach((record, index) => {
    const row = buildRow(record);
    const line = index + 2;
    if (!row.descricao) {
      errors.push(`Linha ${line}: descrição do produto não encontrada.`);
      return;
    }
    rows.push(row.codigo ? row : { ...row, codigo: `IMP-${String(line).padStart(4, "0")}` });
  });

  return { rows, errors, ignoredColumns };
}

export async function parseProdutoFile(file: File): Promise<ProdutoImportResult> {
  if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
    const { parseProdutoPdf } = await import("./produto-pdf-import");
    return parseProdutoPdf(file);
  }

  const { read, utils } = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: ["Arquivo sem planilhas legíveis."], ignoredColumns: [] };
  }
  const records = utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: "",
    raw: true,
  });
  if (records.length === 0) {
    return { rows: [], errors: ["Nenhuma linha encontrada no relatório."], ignoredColumns: [] };
  }
  return mapRecordsToProdutos(records);
}
