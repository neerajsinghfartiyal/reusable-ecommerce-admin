import { cn } from "@/lib/utils"
import ModuleHeader from "@/components/admin-ui/ModuleHeader"

/** Shared vertical rhythm between page sections (toolbar, alerts, cards, grids). */
export const adminPageStackClass = "flex flex-col gap-5 md:gap-6"

function AdminPage({
  title = "",
  description = "",
  actions = null,
  children,
  className = "",
  headerMode = "default",
  contentClassName = "",
}) {
  const showHeader =
    headerMode !== "hidden" && (title || description || actions)
  const isCompactHeader = headerMode === "compact"

  return (
    <section className={cn(className)}>
      {showHeader ? (
        <ModuleHeader
          title={title}
          description={description}
          actions={actions}
          compact={isCompactHeader}
          className="mb-5 md:mb-6"
        />
      ) : null}
      <div className={cn(adminPageStackClass, contentClassName)}>{children}</div>
    </section>
  )
}

export default AdminPage
