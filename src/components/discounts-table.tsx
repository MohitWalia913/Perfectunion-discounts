import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCell, pickTableColumns } from "@/lib/treez"

type Row = Record<string, unknown>

export function DiscountsTable({ rows }: { rows: Row[] }) {
  const columns = pickTableColumns(rows as Row[])

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-16 text-center">
        <p className="text-sm font-medium text-foreground">No discounts returned</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The API responded successfully but the list is empty, or the payload shape differs from what we
          expect.
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[min(70vh,calc(100vh-12rem)))] w-full rounded-xl border border-border/80 shadow-sm">
      <Table className="min-w-[720px]">
        <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead
                key={col}
                className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {col.replace(/_/g, " ")}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(rows as Row[]).map((row, i) => (
            <TableRow
              key={i}
              className="group border-border/60 transition-colors hover:bg-muted/40"
            >
              {columns.map((col) => {
                const v = row[col]
                const text = formatCell(v)
                const isActiveCol =
                  col === "active" || col === "enabled" || col === "discount_active"
                if (isActiveCol && typeof v === "boolean") {
                  return (
                    <TableCell key={col} className="whitespace-nowrap">
                      <Badge variant={v ? "default" : "secondary"} className="font-medium">
                        {v ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  )
                }
                return (
                  <TableCell
                    key={col}
                    className="max-w-[220px] truncate text-sm text-foreground/90"
                    title={text}
                  >
                    {text}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
