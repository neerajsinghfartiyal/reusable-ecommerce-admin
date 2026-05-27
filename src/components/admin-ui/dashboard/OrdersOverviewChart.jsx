import { useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import DashboardSectionHeader from '@/components/admin-ui/dashboard/DashboardSectionHeader'
import MiniAreaChart from '@/components/admin-ui/dashboard/MiniAreaChart'
import { getOrdersSeries } from '@/components/admin-ui/dashboard/dashboardAnalyticsMock'
import ModuleCard from '@/components/admin-ui/ModuleCard'

function OrdersOverviewChart({ className = '' }) {
  const [range, setRange] = useState('weekly')
  const series = useMemo(() => getOrdersSeries(range), [range])

  const completedTotal = series.completed.reduce((sum, n) => sum + n, 0)
  const pendingTotal = series.pending.reduce((sum, n) => sum + n, 0)

  return (
    <ModuleCard
      compact
      tone="muted"
      className={cn('dashboard-module-card min-w-0 overflow-hidden', className)}
    >
      <DashboardSectionHeader
        compact
        title="Orders overview"
        description="Completed vs pending order volume (demo data)."
        action={
          <div className="inline-flex rounded-lg border border-slate-200/80 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
            {['weekly', 'monthly'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                className={cn(
                  'cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                  range === key
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
                )}
              >
                {key}
              </button>
            ))}
          </div>
        }
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          +{series.growthPercent}% order volume
        </p>
        <ul className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-900 dark:bg-slate-100" aria-hidden />
            Completed ({completedTotal})
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden />
            Pending ({pendingTotal})
          </li>
        </ul>
      </div>
      <div className="mt-3 min-w-0">
        <MiniAreaChart
          values={series.completed}
          secondaryValues={series.pending}
          labels={series.labels}
          height={128}
        />
      </div>
    </ModuleCard>
  )
}

export default OrdersOverviewChart
