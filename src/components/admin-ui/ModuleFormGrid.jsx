import { cn } from "@/lib/utils"

function ModuleFormGrid({
  children,
  columns = 2,
  className = "",
  gap = "default",
  breakpoint = "md"
}) {
  const bp = breakpoint === "lg" ? "lg" : "md"
  const gridColumnsClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? `grid-cols-1 ${bp}:grid-cols-3`
        : `grid-cols-1 ${bp}:grid-cols-2`

  const gapClass = gap === "sm" ? "gap-3" : gap === "lg" ? "gap-5" : "gap-4"

  return <div className={cn("grid", gapClass, gridColumnsClass, className)}>{children}</div>
}

export default ModuleFormGrid
