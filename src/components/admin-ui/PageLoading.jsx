import { cn } from "@/lib/utils"
import AdminAlert from "@/components/admin-ui/AdminAlert"
import ModuleCard from "@/components/admin-ui/ModuleCard"

function PageLoading({ message = "Loading...", title = "Loading", className = "" }) {
  return (
    <ModuleCard className={className}>
      <AdminAlert type="info" title={title}>
        {message}
      </AdminAlert>
    </ModuleCard>
  )
}

export default PageLoading
