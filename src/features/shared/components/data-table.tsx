import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";

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

export function DataTable<T>({ columns, data, rowKey = "id" as keyof T }: DataTableProps<T>) {
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
            {data.map((row) => (
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
      </CardContent>
    </Card>
  );
}
