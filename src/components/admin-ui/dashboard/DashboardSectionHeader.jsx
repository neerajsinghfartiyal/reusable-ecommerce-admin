import { cn } from '@/lib/utils'

function DashboardSectionHeader({ title, description = '', action = null, compact = false }) {
  return (
    <div
      className={cn(
        'flex flex-col border-b border-slate-200/70 dark:border-slate-800/90 sm:flex-row sm:items-end sm:justify-between',
        compact ? 'gap-2 pb-2.5' : 'gap-3 pb-4'
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              'text-slate-500 dark:text-slate-400',
              compact ? 'mt-0.5 text-xs leading-snug' : 'mt-1 text-sm leading-relaxed'
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  )
}

export default DashboardSectionHeader
