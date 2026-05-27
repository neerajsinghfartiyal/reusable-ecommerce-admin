import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const statusStyles = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  enabled: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  disabled: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  simple: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  variable: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  inactive: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  cod_pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  unfulfilled: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  refunded: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  partially_refunded: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  shipped: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  packed: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  requested: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  closed: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  return: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  exchange: "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300",
  received: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  exchanged: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  returned: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  processing_payment: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
}

function ModuleStatusBadge({ status = "inactive", type = "" }) {
  const normalized = String(status || "inactive").trim().toLowerCase()
  const label = String(status || "inactive")
  const style = statusStyles[normalized] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"

  return (
    <Badge
      variant="secondary"
      className={cn(
        "h-6 shrink-0 rounded-full border border-transparent px-2.5 text-[11px] font-semibold capitalize tracking-wide",
        style,
        type === "pill" && "rounded-full"
      )}
    >
      {label}
    </Badge>
  )
}

export default ModuleStatusBadge
