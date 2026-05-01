import { useState } from "react"
import { Outlet } from "react-router-dom"

import AppSidebar from "./AppSidebar"
import AppTopbar from "./AppTopbar"
import { Sheet, SheetContent } from "@/components/ui/sheet"

function AdminShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200/70 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950 md:block">
          <AppSidebar />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 border-r border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-950">
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col bg-transparent">
          <AppTopbar onOpenSidebar={() => setMobileOpen(true)} />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-[1400px]">{children || <Outlet />}</div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminShell
