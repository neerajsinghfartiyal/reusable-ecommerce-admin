import { cn } from "@/lib/utils"
import { adminHelperTextClass, adminLabelClass } from "@/components/admin-ui/adminStyles"

function AdminField({
  label = "",
  description = "",
  error = "",
  required = false,
  children,
  className = ""
}) {
  const descriptionId = description ? `${label || "field"}-description` : undefined
  const errorId = error ? `${label || "field"}-error` : undefined

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label className={adminLabelClass}>
          {label}
          {required ? <span className="ml-1 text-red-600 dark:text-red-400">*</span> : null}
        </label>
      ) : null}

      <div aria-describedby={[errorId, descriptionId].filter(Boolean).join(" ") || undefined}>
        {children}
      </div>

      {error ? (
        <p id={errorId} className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : description ? (
        <p id={descriptionId} className={adminHelperTextClass}>
          {description}
        </p>
      ) : null}
    </div>
  )
}

export default AdminField
