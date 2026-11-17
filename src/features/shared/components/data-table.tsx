import { useState, type ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DataTableProps<T> {
  readonly columns: {
    readonly header: string;
    readonly key: keyof T | string;
    readonly className?: string;
    readonly render?: (row: T) => ReactNode;
  }[];
  readonly data: T[];
  readonly rowKey?: keyof T;
}

const PAGE_SIZE = 50;

export function DataTable<T>({ columns, data, rowKey = "id" as keyof T }: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageRows = data.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead key={idx} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => (
              <TableRow key={String(row[rowKey])}>
                {columns.map((col, idx) => (
                  <TableCell key={idx} className={col.className}>
                    {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data.length > PAGE_SIZE ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
            <p className="text-muted-foreground text-sm" aria-live="polite">
              Exibindo {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, data.length)} de {data.length} registros
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setCurrentPage(safePage - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm tabular-nums">
                {safePage + 1} / {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= pageCount - 1}
                onClick={() => setCurrentPage(safePage + 1)}
              >
                Próximo
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
