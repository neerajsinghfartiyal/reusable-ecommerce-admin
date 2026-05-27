import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function ModuleCard({
  title = "",
  description = "",
  actions = null,
  children,
  className = "",
  compact = false,
  tone = "default"
}) {
  const toneClass =
    tone === "muted"
      ? "bg-slate-50/70 dark:bg-slate-900/60"
      : tone === "transparent"
        ? "bg-transparent shadow-none dark:shadow-none"
        : "bg-white dark:bg-slate-900/80"

  const fillHeight =
    String(className).includes("h-full") || String(className).includes("dashboard-pair-card")

  return (
    <Card
      className={cn(
        "rounded-xl border border-slate-200/80 shadow-sm transition-shadow dark:border-slate-800/90 dark:shadow-none",
        String(className).includes("product-form-section") &&
          "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]",
        fillHeight && "flex h-full flex-col",
        toneClass,
        className
      )}
    >
      {title || description || actions ? (
        <CardHeader className={cn(compact ? "pb-3" : "pb-4", compact && "p-4")}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              {title ? (
                <CardTitle className="text-base text-slate-900 dark:text-slate-100">{title}</CardTitle>
              ) : null}
              {description ? (
                <CardDescription className="mt-1 text-slate-500 dark:text-slate-400">
                  {description}
                </CardDescription>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent
        className={cn(
          compact ? (title || description || actions ? "p-3.5 pt-0" : "p-3.5") : undefined,
          fillHeight && "flex flex-1 flex-col"
        )}
      >
        {children}
      </CardContent>
    </Card>
  )
}

export default ModuleCard
