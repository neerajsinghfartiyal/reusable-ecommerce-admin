import { cn } from "@/lib/utils"

function ModuleHeader({
  title,
  description = "",
  actions = null,
  compact = false,
  actionsAlign = "start",
  className = ""
}) {
  const actionsAlignClass = actionsAlign === "end" ? "sm:justify-end" : "sm:justify-start"

  return (
    <div
      className={cn(
        compact ? "mb-3" : "mb-4",
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div>
        <h1
          className={cn(
            compact ? "text-xl" : "text-2xl",
            "font-semibold tracking-tight text-slate-900 dark:text-slate-100"
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className={cn("flex flex-wrap items-center gap-2", actionsAlignClass)}>{actions}</div>
      ) : null}
    </div>
  )
}

export default ModuleHeader
