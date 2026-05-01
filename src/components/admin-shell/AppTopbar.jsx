import { useNavigate } from "react-router-dom"
import { LogOut, Moon, Search, Settings, Sun, UserCog } from "lucide-react"

import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function AppTopbar({ onOpenSidebar }) {
  const navigate = useNavigate()
  const { admin, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const adminName = admin?.name || admin?.email || "Admin User"
  const adminEmail = admin?.email || ""
  const adminRole = admin?.role || "Admin"

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const initials = adminName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:px-6">
      <div className="flex items-center gap-3">
        {onOpenSidebar ? (
          <Button type="button" variant="outline" size="sm" className="md:hidden" onClick={onOpenSidebar}>
            Menu
          </Button>
        ) : null}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Admin Console</p>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{adminName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{adminRole}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden lg:flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          <Search className="h-3.5 w-3.5" />
          Search (coming soon)
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
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
              className="h-8 w-8 rounded-full"
              title="Open account menu"
              aria-label="Open account menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-semibold">{initials || "AD"}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{adminName}</p>
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">{adminEmail || adminRole}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{adminRole}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <Settings className="mr-2 h-4 w-4" />
              Profile Settings (coming soon)
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <UserCog className="mr-2 h-4 w-4" />
              Account Preferences (coming soon)
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
