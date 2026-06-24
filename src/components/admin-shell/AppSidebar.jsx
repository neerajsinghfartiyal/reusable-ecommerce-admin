import { useEffect, useMemo, useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import {
  ChevronDown,
  ChevronUp,
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react"

import { useAuth } from "../../context/useAuth"
import { useTheme } from "../../context/useTheme"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getStoreSettings } from "../../api/storeSettingApi"
import BrandMark from "./BrandMark"
import { refreshBrandingFromApi, STORE_SETTINGS_PATH, useBranding } from "./branding-config"
import { refreshCurrencyFromApi } from "../../lib/currency"
import { PROFILE_PATH } from "../../pages/Profile"
import { sidebarSections } from "./sidebar-config"

const isRouteActive = (pathname, basePath) =>
  pathname === basePath || pathname.startsWith(`${basePath}/`)

const isItemActive = (pathname, item) => {
  const paths = Array.isArray(item.matchPaths) && item.matchPaths.length > 0 ? item.matchPaths : [item.to]
  return paths.some((path) => isRouteActive(pathname, path))
}

function AppSidebar({ onNavigate }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { admin, logout, isAuthenticated } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const branding = useBranding()
  const [openGroups, setOpenGroups] = useState({})
  const adminName = admin?.name || admin?.email || "Admin User"
  const adminEmail = admin?.email || ""
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
    if (!isAuthenticated) return
    refreshBrandingFromApi(getStoreSettings)
    refreshCurrencyFromApi(getStoreSettings)
  }, [isAuthenticated])

  const handleLogout = () => {
    logout()
    navigate("/login")
    onNavigate?.()
  }

  const handleNav = (to) => {
    navigate(to)
    onNavigate?.()
  }

  return (
    <aside className="flex h-full w-full flex-col bg-transparent text-slate-900 dark:text-slate-100">
      <div className="px-3 py-4 md:px-4">
        <div className="sidebar-brand-block flex items-center gap-3 rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white px-3 py-3 shadow-sm transition-colors dark:border-slate-800/90 dark:from-slate-900/80 dark:to-slate-950/90 dark:shadow-none">
          <BrandMark branding={branding} size="md" showInitials />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {branding.brandName}
            </p>
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {branding.brandSubtitle}
            </p>
          </div>
        </div>
      </div>
      <Separator className="bg-slate-200/70 dark:bg-slate-800/80" />
      <ScrollArea className="flex-1 px-2 py-3 md:px-3 md:py-4">
        <nav className="space-y-2">
          {sidebarSections.map((section) => {
            const SectionIcon = section.icon
            const isOpen = openGroups[section.key] || activeGroups[section.key]

            return (
              <div
                key={section.key}
                className="overflow-hidden rounded-lg border border-slate-200/50 bg-white/60 dark:border-slate-800/60 dark:bg-slate-900/30"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroups((prev) => ({ ...prev, [section.key]: !isOpen }))
                  }
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800/50",
                    isOpen && "bg-slate-100/80 dark:bg-slate-800/50",
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <SectionIcon className="h-4 w-4 shrink-0 opacity-80" />
                    {section.title}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 opacity-70 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                {isOpen ? (
                  <div className="space-y-0.5 border-t border-slate-200/50 px-1.5 py-1.5 dark:border-slate-800/60">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition-all duration-150",
                              "hover:bg-slate-100/90 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100",
                              (isActive || isItemActive(pathname, item)) &&
                                "bg-slate-900 text-white shadow-sm shadow-slate-900/10 hover:bg-slate-900 hover:text-white dark:bg-slate-100 dark:text-slate-900 dark:shadow-none dark:hover:bg-slate-100 dark:hover:text-slate-900",
                            )
                          }
                        >
                          {ItemIcon ? <ItemIcon className="h-4 w-4 shrink-0" /> : null}
                          <span className="truncate">{item.label}</span>
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
      <Separator className="bg-slate-200/70 dark:bg-slate-800/80" />
      <div className="px-3 py-3 md:px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-lg border border-slate-200/60 bg-slate-50/50 px-3 py-2.5 text-left transition-colors",
                "hover:border-slate-300/80 hover:bg-slate-100/90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                "active:bg-slate-100",
                "dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:border-slate-700 dark:hover:bg-slate-800/60",
                "dark:focus-visible:ring-slate-400/25 dark:focus-visible:ring-offset-slate-950",
                "dark:active:bg-slate-800/80",
              )}
              aria-label="Open account menu"
            >
              <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white/80 dark:ring-slate-800/80">
                <AvatarFallback className="bg-slate-800 text-xs font-semibold text-white dark:bg-slate-200 dark:text-slate-900">
                  {initials || branding.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {adminName}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {adminRole}
                </p>
              </div>
              <ChevronUp className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[14rem] border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          >
            <DropdownMenuLabel className="space-y-0.5 font-normal">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {adminName}
              </p>
              {adminEmail ? (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {adminEmail}
                </p>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => handleNav(PROFILE_PATH)}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => handleNav(`${PROFILE_PATH}#account-settings`)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => handleNav(STORE_SETTINGS_PATH)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Store Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={(event) => {
                event.preventDefault()
                toggleTheme()
              }}
            >
              {isDark ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              Appearance
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-rose-600 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-400"
              onSelect={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}

export default AppSidebar
