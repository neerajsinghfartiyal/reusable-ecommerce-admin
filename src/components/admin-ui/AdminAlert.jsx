import { cn } from "@/lib/utils"

const typeStyles = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300",
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300",
  info:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300"
}

function AdminAlert({ type = "info", title = "", children, className = "" }) {
  const alertType = typeStyles[type] ? type : "info"

  return (
    <div className={cn("rounded-lg border px-4 py-3", typeStyles[alertType], className)} role="alert">
      {title ? <p className="text-sm font-semibold">{title}</p> : null}
      {children ? <div className={cn(title ? "mt-1.5 text-sm" : "text-sm")}>{children}</div> : null}
    </div>
  )
}

export default AdminAlert
