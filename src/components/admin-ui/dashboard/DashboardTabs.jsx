import { cn } from "@/lib/utils"

export const getDashboardTabId = (tabId) => `dashboard-tab-${tabId}`
export const getDashboardTabPanelId = (tabId) => `dashboard-panel-${tabId}`

function DashboardTabs({ activeTab, onTabChange, tabs = [] }) {
  return (
    <div className="border-b border-slate-200/80 pb-0 dark:border-slate-800/90">
      <div
        className="-mb-px flex gap-0.5 overflow-x-auto pb-px sm:gap-1"
        role="tablist"
        aria-label="Dashboard sections"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const tabButtonId = getDashboardTabId(tab.id)
          const panelId = getDashboardTabPanelId(tab.id)

          return (
            <button
              key={tab.id}
              id={tabButtonId}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "shrink-0 cursor-pointer rounded-t-md border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4",
                isActive
                  ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default DashboardTabs
