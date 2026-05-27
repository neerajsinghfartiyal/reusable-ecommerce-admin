import {
  Boxes,
  ClipboardList,
  Settings,
  Shield,
  User,
} from 'lucide-react'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import DashboardSectionHeader from '@/components/admin-ui/dashboard/DashboardSectionHeader'
import { Button } from '@/components/ui/button'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import { cn } from '@/lib/utils'

const viewButtonClass =
  'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'

const getReadableAction = (action) =>
  String(action || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || '-'

const getActivityIcon = (moduleName) => {
  const key = String(moduleName || '').toUpperCase()
  if (key.includes('PRODUCT') || key.includes('CATALOG')) return Boxes
  if (key.includes('ORDER') || key.includes('SALES')) return ClipboardList
  if (key.includes('SETTING')) return Settings
  if (key.includes('ADMIN') || key.includes('USER')) return User
  return Shield
}

function RecentActivityWidget({
  activities = [],
  warning = '',
  onViewActivityLogs,
  formatDateTime,
  getTextValue,
  title = 'Recent Activity',
  description = 'Latest operational events.',
}) {
  const activityRows = activities.slice(0, 5)

  return (
    <ModuleCard
      compact
      tone="muted"
      className="dashboard-module-card dashboard-pair-card h-full min-w-0"
    >
      <div className="dashboard-pair-card-shell">
      <DashboardSectionHeader
        compact
        title={title}
        description={description}
        action={
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={cn('h-8 text-xs', viewButtonClass)}
            onClick={onViewActivityLogs}
          >
            View all
          </Button>
        }
      />
      <div className="dashboard-pair-card-body">
        {warning ? (
          <AdminAlert type="warning" title="Activity unavailable" className="mb-3">
            {warning}
          </AdminAlert>
        ) : null}
        {activityRows.length === 0 ? (
          <div className="dashboard-pair-empty-slot">
            <div className="dashboard-widget-empty" role="status">
              <span className="dashboard-widget-empty-icon" aria-hidden>
                <Shield className="h-4 w-4" />
              </span>
              <p className="dashboard-widget-empty-title">No recent activity</p>
              <p className="dashboard-widget-empty-desc">
                Admin actions will appear here as your team works.
              </p>
            </div>
          </div>
        ) : (
          <ul className="relative flex flex-col" role="list">
            {activityRows.map((item, index) => {
              const id = item?._id || item?.id || `activity-feed-${index}`
              const actionLabel = getReadableAction(getTextValue(item?.action))
              const moduleValue = getTextValue(item?.module)
              const timestamp = formatDateTime(item?.createdAt || item?.updatedAt)
              const Icon = getActivityIcon(moduleValue)
              const isLast = index === activityRows.length - 1

              return (
                <li
                  key={id}
                  className={cn('relative flex gap-3', !isLast && 'pb-3.5 mb-3.5 border-b border-slate-200/70 dark:border-slate-800/80')}
                >
                  <span className="relative z-[1] inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1">
                      <p className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                        {actionLabel}
                      </p>
                      <time
                        dateTime={item?.createdAt || item?.updatedAt || undefined}
                        className="shrink-0 pt-0.5 text-right text-[11px] leading-none tabular-nums text-slate-400 dark:text-slate-500"
                      >
                        {timestamp}
                      </time>
                      {moduleValue && moduleValue !== '-' ? (
                        <p className="col-span-2 truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {moduleValue}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      </div>
    </ModuleCard>
  )
}

export default RecentActivityWidget
