import ModuleToolbar from "@/components/admin-ui/ModuleToolbar"
import { cn } from "@/lib/utils"

function AdminFilterBar({ children, className = "", dense = false }) {
  return (
    <ModuleToolbar
      dense={dense}
      className={cn(
        "flex-col items-stretch gap-4 lg:flex-row lg:flex-wrap lg:items-end",
        className
      )}
    >
      {children}
    </ModuleToolbar>
  )
}

export default AdminFilterBar
