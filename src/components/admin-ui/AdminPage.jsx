import { cn } from "@/lib/utils"
import ModuleHeader from "@/components/admin-ui/ModuleHeader"

function AdminPage({ title = "", description = "", actions = null, children, className = "" }) {
  return (
    <section className={cn("space-y-4 md:space-y-5", className)}>
      {title || description || actions ? (
        <ModuleHeader title={title} description={description} actions={actions} className="mb-0" />
      ) : null}
      <div className="space-y-4 md:space-y-5">{children}</div>
    </section>
  )
}

export default AdminPage
