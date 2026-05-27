import AdminField from "@/components/admin-ui/AdminField"
import { cn } from "@/lib/utils"

function AdminFilterField({
  label = "",
  children,
  className = "",
  variant = "filter",
}) {
  const variantClass =
    variant === "search"
      ? "min-w-[220px] w-full flex-1"
      : "w-full sm:w-[180px]"

  return (
    <AdminField label={label} className={cn(variantClass, className)}>
      {children}
    </AdminField>
  )
}

export default AdminFilterField
