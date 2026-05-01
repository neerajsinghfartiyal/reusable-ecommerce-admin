import { cn } from "@/lib/utils"
import { adminSelectClass } from "@/components/admin-ui/adminStyles"

function AdminSelect({
  value,
  onChange,
  name,
  disabled = false,
  children,
  className = "",
  "aria-label": ariaLabel,
  ...props
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      name={name}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(adminSelectClass, className)}
      {...props}
    >
      {children}
    </select>
  )
}

export default AdminSelect
