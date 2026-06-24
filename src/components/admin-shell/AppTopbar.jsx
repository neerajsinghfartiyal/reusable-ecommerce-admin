import { useMemo, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Bell, LogOut, Moon, Search, Settings, Sun, User, Users } from "lucide-react"

import { useAuth } from "../../context/useAuth"
import { useTheme } from "../../context/useTheme"
import { PROFILE_PATH } from "../../pages/Profile"
import { STORE_SETTINGS_PATH } from "./branding-config"
import { getBreadcrumbDisplay, getPageMeta, QUICK_NAV_LINKS } from "./topbar-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const iconButtonClass =
  "h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"

function AppTopbar({ onOpenSidebar }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { admin, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { title, breadcrumbs } = getPageMeta(pathname)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const adminName = admin?.name || admin?.email || "Admin User"
  const adminEmail = admin?.email || ""
  const adminRole = admin?.role || "Admin"
  const breadcrumbDisplay = getBreadcrumbDisplay(breadcrumbs, title)

  const filteredNavLinks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return QUICK_NAV_LINKS
    }
    return QUICK_NAV_LINKS.filter((item) => item.label.toLowerCase().includes(query))
  }, [searchQuery])

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const handleNavSelect = (to) => {
    setSearchOpen(false)
    setSearchQuery("")
    navigate(to)
  }

  const initials = adminName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")

  const searchPanel = (
    <DropdownMenuContent
      align="end"
      className="w-[min(100vw-2rem,20rem)] border-slate-200 bg-white p-0 dark:border-slate-700 dark:bg-slate-900"
      onCloseAutoFocus={(event) => event.preventDefault()}
    >
      <div className="border-b border-slate-200/80 px-3 py-2.5 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Quick navigation
        </p>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            type="search"
            value={searchQuery}
            placeholder="Filter modules…"
            aria-label="Filter quick navigation links"
            className="h-9 pl-9 text-slate-900 dark:text-slate-100"
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
          />
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto p-1">
        {filteredNavLinks.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No matching modules
          </p>
        ) : (
          filteredNavLinks.map((item) => (
            <DropdownMenuItem
              key={item.to}
              className="cursor-pointer"
              onSelect={() => handleNavSelect(item.to)}
            >
              {item.label}
            </DropdownMenuItem>
          ))
        )}
      </div>
    </DropdownMenuContent>
  )

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 dark:border-slate-800/90 dark:bg-slate-950/90 dark:supports-[backdrop-filter]:bg-slate-950/80 md:h-16 md:gap-4 md:px-5 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
        {onOpenSidebar ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 md:hidden"
            onClick={onOpenSidebar}
          >
            Menu
          </Button>
        ) : null}
        <div className="min-w-0">
          {breadcrumbDisplay ? (
            <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {breadcrumbDisplay}
            </p>
          ) : null}
          <h1
            className={cn(
              "truncate font-semibold tracking-tight text-slate-900 dark:text-slate-100",
              breadcrumbDisplay ? "text-sm md:text-base" : "text-base md:text-lg"
            )}
          >
            {title}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        <DropdownMenu open={searchOpen} onOpenChange={setSearchOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                iconButtonClass,
                "relative inline-flex items-center justify-center md:h-9 md:w-[10.5rem] md:justify-start md:rounded-md md:border md:bg-slate-50/80 md:px-0 md:text-left md:text-sm md:text-slate-500 md:hover:bg-slate-100 lg:w-56 dark:md:bg-slate-900/80 dark:md:text-slate-400 dark:md:hover:bg-slate-800",
                searchOpen && "md:ring-2 md:ring-slate-900/10 dark:md:ring-slate-400/20"
              )}
              title="Quick navigation"
              aria-label="Open quick navigation"
              aria-expanded={searchOpen}
            >
              <Search className="h-4 w-4 shrink-0 md:absolute md:left-2.5 md:text-slate-400 dark:md:text-slate-500" />
              <span className="hidden truncate pl-9 pr-3 md:inline">Quick nav…</span>
            </button>
          </DropdownMenuTrigger>
          {searchPanel}
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(iconButtonClass, "hidden sm:inline-flex")}
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-72 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          >
            <DropdownMenuLabel className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Notifications
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-3 py-4">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                No notifications yet
              </p>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Store alerts and system updates will appear here.
              </p>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className={iconButtonClass}
          title="Store settings"
          aria-label="Store settings"
          onClick={() => navigate("/settings")}
        >
          <Settings className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className={iconButtonClass}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggleTheme}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
              title="Open account menu"
              aria-label="Open account menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-semibold">{initials || "AD"}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <DropdownMenuLabel className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{adminName}</p>
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">{adminEmail || adminRole}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {adminRole}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate(PROFILE_PATH)}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate(`${PROFILE_PATH}#account-settings`)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate(STORE_SETTINGS_PATH)}>
              <Settings className="mr-2 h-4 w-4" />
              Store Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/admin-users")}>
              <Users className="mr-2 h-4 w-4" />
              Admin Users
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default AppTopbar
