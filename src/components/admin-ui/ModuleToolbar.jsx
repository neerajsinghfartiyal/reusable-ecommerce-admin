import { cn } from "@/lib/utils"

function ModuleToolbar({ children, className = "", dense = false }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/90 dark:bg-slate-900/70 dark:shadow-none sm:flex-row sm:flex-wrap sm:items-end",
        dense ? "p-2.5" : "p-3",
        className
      )}
    >
      {children}
    </div>
  )
}

export default ModuleToolbar
