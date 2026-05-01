import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

function ModuleTable({
  columns = [],
  data = [],
  renderRow,
  emptyMessage = "No records found.",
  compact = false,
  stickyHeader = false,
  className = ""
}) {
  const colSpan = Math.max(1, columns.length)

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/90 dark:bg-slate-900/75 dark:shadow-none",
        className
      )}
    >
      <Table
        className={cn(
          "[&_tbody_tr:last-child]:border-0",
          compact
            ? "[&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5"
            : "[&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3"
        )}
      >
        <TableHeader
          className={cn(
            "bg-slate-50/80 dark:bg-slate-900",
            stickyHeader && "sticky top-0 z-10"
          )}
        >
          <TableRow className="hover:bg-slate-50/80 dark:hover:bg-slate-900">
            {columns.map((column) => (
              <TableHead
                key={column.key || column.label}
                className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr]:border-slate-100 dark:[&_tr]:border-slate-800/90 [&_tr]:transition-colors [&_tr:hover]:bg-slate-50/60 dark:[&_tr:hover]:bg-slate-800/50">
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={colSpan}
                className="py-10 text-center text-sm text-slate-500 dark:text-slate-400"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => renderRow(item, index))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default ModuleTable
