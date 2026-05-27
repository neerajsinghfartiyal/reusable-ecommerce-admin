import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function QuickActionCard({
  title,
  description = '',
  icon: Icon,
  onClick,
  to = '',
  className = '',
}) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (typeof onClick === 'function') {
      onClick()
      return
    }
    if (to) navigate(to)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 text-left shadow-sm transition-all duration-200',
        'hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50/90 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2',
        'dark:border-slate-800/90 dark:bg-slate-900/80 dark:hover:border-slate-700 dark:hover:bg-slate-800/90 dark:hover:shadow-lg dark:hover:shadow-black/20 dark:focus-visible:ring-slate-400 dark:focus-visible:ring-offset-slate-950',
        className,
      )}
    >
      {Icon ? (
        <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200/90 bg-slate-50 text-slate-600 transition-colors group-hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Icon className="h-3.5 w-3.5" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{title}</p>
        {description ? (
          <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      <ChevronRight
        className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400"
        aria-hidden
      />
    </button>
  )
}

export default QuickActionCard
