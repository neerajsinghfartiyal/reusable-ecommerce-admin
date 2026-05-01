import { cn } from "@/lib/utils"

function ModuleToolbar({ children, className = "", dense = false }) {
  return (
    <div
      className={cn(
        dense ? "mb-3 p-2.5" : "mb-4 p-3",
        "flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/90 dark:bg-slate-900/70 dark:shadow-none sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {children}
    </div>
  )
}

export default ModuleToolbar
