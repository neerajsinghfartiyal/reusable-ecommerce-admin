import { useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import DashboardSectionHeader from '@/components/admin-ui/dashboard/DashboardSectionHeader'
import MiniAreaChart from '@/components/admin-ui/dashboard/MiniAreaChart'
import { getRevenueSeries } from '@/components/admin-ui/dashboard/dashboardAnalyticsMock'
import ModuleCard from '@/components/admin-ui/ModuleCard'

function RevenueOverviewChart({ className = '' }) {
  const [range, setRange] = useState('weekly')
  const series = useMemo(() => getRevenueSeries(range), [range])

  return (
    <ModuleCard
      compact
      tone="muted"
      className={cn('dashboard-module-card min-w-0 overflow-hidden', className)}
    >
      <DashboardSectionHeader
        compact
        title="Revenue overview"
        description="Paid order revenue trend (demo data)."
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
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {series.totalLabel}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              +{series.growthPercent}%
            </span>
            vs previous period
          </p>
        </div>
      </div>
      <div className="mt-4 min-w-0">
        <MiniAreaChart values={series.values} labels={series.labels} height={128} />
      </div>
    </ModuleCard>
  )
}

export default RevenueOverviewChart
