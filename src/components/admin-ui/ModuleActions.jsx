import { cn } from "@/lib/utils"

function ModuleActions({
  children,
  className = "",
  align = "start",
  wrap = "nowrap"
}) {
  const alignClass =
    align === "center"
      ? "justify-center"
      : align === "end"
        ? "justify-end"
        : "justify-start"

  const wrapClass = wrap === "wrap" ? "flex-wrap whitespace-normal" : "whitespace-nowrap"

  return (
    <div
      className={cn(
        "flex flex-row items-center gap-2",
        alignClass,
        wrapClass,
        className
      )}
    >
      {children}
    </div>
  )
}

export default ModuleActions
