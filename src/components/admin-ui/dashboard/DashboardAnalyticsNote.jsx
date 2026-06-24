import { cn } from '@/lib/utils'

function DashboardAnalyticsNote({ className = '' }) {
  return (
    <p
      className={cn(
        'text-xs leading-relaxed text-slate-500 dark:text-slate-400',
        className,
      )}
    >
      Advanced reporting will be available once analytics tracking is connected.
    </p>
  )
}

export default DashboardAnalyticsNote
