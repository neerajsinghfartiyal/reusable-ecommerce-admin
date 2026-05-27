import { useNavigate } from 'react-router-dom'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const accentStyles = {
  slate: 'from-slate-400/80 via-slate-300/40 to-transparent dark:from-slate-500/80',
  blue: 'from-sky-500/70 via-sky-400/30 to-transparent',
  green: 'from-emerald-500/70 via-emerald-400/30 to-transparent',
  amber: 'from-amber-500/70 via-amber-400/30 to-transparent',
  violet: 'from-violet-500/70 via-violet-400/30 to-transparent',
  rose: 'from-rose-500/70 via-rose-400/30 to-transparent',
}

function MetricCard({
  title,
  value,
  description = '',
  insight = '',
  icon: Icon,
  to = '',
  onClick,
  trend,
  trendDirection = 'up',
  accent = 'slate',
  className = '',
}) {
  const navigate = useNavigate()
  const isClickable = Boolean(to || onClick)

  const handleClick = () => {
    if (typeof onClick === 'function') {
      onClick()
      return
    }
    if (to) navigate(to)
  }

  const handleKeyDown = (event) => {
    if (!isClickable) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }

  const TrendIcon = trendDirection === 'down' ? TrendingDown : TrendingUp
  const trendColor =
    trendDirection === 'down'
      ? 'text-rose-600 dark:text-rose-400'
      : trendDirection === 'neutral'
        ? 'text-slate-500 dark:text-slate-400'
        : 'text-emerald-600 dark:text-emerald-400'

  const Comp = isClickable ? 'button' : 'div'

  return (
    <Comp
      type={isClickable ? 'button' : undefined}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      className={cn(
        'group relative flex min-h-[7.25rem] w-full flex-col justify-between overflow-hidden rounded-xl border border-slate-200/85 bg-white p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-slate-300/90 hover:shadow-md',
        'dark:border-slate-800/85 dark:bg-slate-900/90 dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] dark:hover:border-slate-700 dark:hover:shadow-lg dark:hover:shadow-black/25',
        isClickable &&
          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-950',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
          accentStyles[accent] || accentStyles.slate,
        )}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-1.5 truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
            {value}
          </p>
          {trend ? (
            <p className={cn('mt-1 flex items-center gap-1 text-xs font-semibold', trendColor)}>
              <TrendIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{trend}</span>
            </p>
          ) : null}
        </div>
        {Icon ? (
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-slate-50 text-slate-600 shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:border-slate-300 group-hover:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      {description || insight ? (
        <div className="mt-2.5 border-t border-slate-100/90 pt-2 dark:border-slate-800/80">
          {insight ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{insight}</p>
          ) : null}
          {description ? (
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{description}</p>
          ) : null}
        </div>
      ) : null}
    </Comp>
  )
}

export default MetricCard
