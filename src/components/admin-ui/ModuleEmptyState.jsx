import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function ModuleEmptyState({
  title = "No data found",
  description = "",
  action = null,
  compact = false,
  className = ""
}) {
  return (
    <Card
      className={cn(
        "border-dashed border-slate-300/80 bg-white dark:border-slate-700/90 dark:bg-slate-900/60 dark:shadow-none",
        className
      )}
    >
      <CardContent
        className={cn(
          "flex flex-col items-center justify-center gap-2 text-center",
          compact ? "py-6" : "py-10"
        )}
      >
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {description ? (
          <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </CardContent>
    </Card>
  )
}

export default ModuleEmptyState
