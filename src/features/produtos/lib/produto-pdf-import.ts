import type { ProdutoImportResult, ProdutoImportRow } from "./produto-import";

const NUMBER = String.raw`(-?[\d.]*\d,\d{2})`;
const LINE_PATTERN = new RegExp(
  String.raw`^(\d+)\s+(.+?)\s{2,}(?:(\d{8,14})\s+)?([A-Z]{1,3}[²³]?)\s+` +
    Array.from({ length: 7 }, () => NUMBER).join(String.raw`\s+`) +
    String.raw`\s+(\S)$`,
);
const IGNORED_LINE = /^(Relatório|Código\s+Descrição|\d+\s*-\s*[A-ZÀ-Ú])/;
const REFERENCE_SUFFIX = /\s{2,}[\w./-]{2,}$/;
const COLUMN_GAP = 6;

function toCents(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function toQuantity(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function cleanDescription(value: string): string {
  return value.replace(REFERENCE_SUFFIX, "").replace(/\s+/g, " ").trim();
}

function parseLine(line: string): ProdutoImportRow | null {
  const match = LINE_PATTERN.exec(line.trim());
  if (!match) return null;
  const [, codigo, descricao, codigoBarras, unidade, estoque, custo, , , , varejo] = match;
  const descricaoLimpa = cleanDescription(descricao);
  if (!descricaoLimpa) return null;

  return {
    codigo,
    codigoBarras: codigoBarras ?? "",
    descricao: descricaoLimpa,
    marca: "",
    categoria: "Importado do ERP",
    fornecedor: "",
    unidade,
    custoCentavos: toCents(custo),
    vendaCentavos: toCents(varejo),
    estoqueAtual: toQuantity(estoque),
    estoqueMinimo: 0,
    localizacao: "",
  };
}

interface TextPiece {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

function piecesToLines(pieces: readonly TextPiece[]): readonly string[] {
  const buckets = new Map<number, TextPiece[]>();
  pieces.forEach((piece) => {
    const key = Math.round(piece.y);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(piece);
    else buckets.set(key, [piece]);
  });

  return Array.from(buckets.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, bucket]) =>
      bucket
        .sort((a, b) => a.x - b.x)
        .reduce((line, piece, index, all) => {
          if (index === 0) return piece.text;
          const previous = all[index - 1];
          const gap = piece.x - (previous.x + previous.width);
          return `${line}${gap > COLUMN_GAP ? "  " : gap > 0.8 ? " " : ""}${piece.text}`;
        }, ""),
    );
}

export async function parseProdutoPdf(file: File): Promise<ProdutoImportResult> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const rows: ProdutoImportRow[] = [];
  let skipped = 0;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const pieces = content.items.flatMap<TextPiece>((item) =>
      "str" in item && item.str.trim()
        ? [{ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width }]
        : [],
    );

    piecesToLines(pieces).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || IGNORED_LINE.test(trimmed)) return;
      const row = parseLine(trimmed);
      if (row) rows.push(row);
      else skipped += 1;
    });
    page.cleanup();
  }

  document.cleanup();

  const errors = skipped > 0 ? [`${skipped} linhas não reconhecidas foram ignoradas.`] : [];
  return {
    rows,
    errors: rows.length > 0 ? errors : ["Nenhum produto reconhecido no PDF."],
    ignoredColumns: [],
  };
}
