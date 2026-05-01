import { useEffect, useMemo, useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { ChevronDown, Store } from "lucide-react"

import { useAuth } from "../../context/AuthContext"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { sidebarSections } from "./sidebar-config"

const isRouteActive = (pathname, basePath) =>
  pathname === basePath || pathname.startsWith(`${basePath}/`)

const isItemActive = (pathname, item) => {
  const paths = Array.isArray(item.matchPaths) && item.matchPaths.length > 0 ? item.matchPaths : [item.to]
  return paths.some((path) => isRouteActive(pathname, path))
}

function AppSidebar({ onNavigate }) {
  const { pathname } = useLocation()
  const { admin } = useAuth()
  const [openGroups, setOpenGroups] = useState({})
  const adminName = admin?.name || admin?.email || "Admin User"
  const adminRole = admin?.role || "Admin"
  const initials = adminName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")

  const activeGroups = useMemo(() => {
    const next = {}
    sidebarSections.forEach((section) => {
      next[section.key] = section.items.some((item) => isItemActive(pathname, item))
    })
    return next
  }, [pathname])

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev }
      sidebarSections.forEach((section) => {
        if (activeGroups[section.key]) {
          next[section.key] = true
        } else if (next[section.key] === undefined) {
          next[section.key] = false
        }
      })
      return next
    })
  }, [activeGroups])

  return (
    <aside className="flex h-full w-full flex-col bg-transparent text-slate-900 dark:text-slate-100">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Reusable Admin</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ecommerce CMS</p>
          </div>
        </div>
      </div>
      <Separator className="bg-slate-200/80 dark:bg-slate-800" />
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-3">
          {sidebarSections.map((section) => {
            const SectionIcon = section.icon
            const isOpen = openGroups[section.key] || activeGroups[section.key]

            return (
              <div key={section.key} className="rounded-xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroups((prev) => ({ ...prev, [section.key]: !isOpen }))
                  }
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70",
                    isOpen && "bg-slate-50 dark:bg-slate-800/70"
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <SectionIcon className="h-4 w-4" />
                    {section.title}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </button>

                {isOpen ? (
                  <div className="space-y-1 px-2 pb-2.5">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                              (isActive || isItemActive(pathname, item)) &&
                                "bg-slate-900 text-white shadow-sm hover:bg-slate-900 hover:text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-100 dark:hover:text-slate-900"
                            )
                          }
                        >
                          {ItemIcon ? <ItemIcon className="h-4 w-4" /> : null}
                          {item.label}
                        </NavLink>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>
      </ScrollArea>
      <Separator className="bg-slate-200/80 dark:bg-slate-800" />
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs font-semibold">{initials || "AD"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{adminName}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{adminRole}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default AppSidebar
