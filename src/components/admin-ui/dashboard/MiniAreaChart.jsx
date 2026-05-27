import { useId, useMemo } from 'react'
import { cn } from '@/lib/utils'

const CHART_WIDTH = 400
const CHART_HEIGHT = 120
const PAD = { top: 8, right: 4, bottom: 4, left: 4 }

const buildPath = (values, height, width, close = false) => {
  if (!values.length) return ''
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const innerW = width - PAD.left - PAD.right
  const innerH = height - PAD.top - PAD.bottom

  const points = values.map((value, index) => {
    const x = PAD.left + (index / Math.max(values.length - 1, 1)) * innerW
    const y = PAD.top + innerH - ((value - min) / range) * innerH
    return [x, y]
  })

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ')

  if (!close) return line

  const last = points[points.length - 1]
  const first = points[0]
  return `${line} L${last[0].toFixed(2)},${(height - PAD.bottom).toFixed(2)} L${first[0].toFixed(2)},${(height - PAD.bottom).toFixed(2)} Z`
}

function MiniAreaChart({
  values = [],
  labels = [],
  className = '',
  height = CHART_HEIGHT,
  strokeClass = 'stroke-slate-900 dark:stroke-slate-100',
  fillClass = 'fill-slate-900/10 dark:fill-slate-100/10',
  secondaryValues = null,
  secondaryStrokeClass = 'stroke-sky-500 dark:stroke-sky-400',
  secondaryFillClass = 'fill-sky-500/10 dark:fill-sky-400/10',
}) {
  const gradientId = useId().replace(/:/g, '')
  const areaPath = useMemo(
    () => buildPath(values, height, CHART_WIDTH, true),
    [values, height],
  )
  const linePath = useMemo(() => buildPath(values, height, CHART_WIDTH, false), [values, height])
  const secondaryAreaPath = useMemo(() => {
    if (!secondaryValues?.length) return ''
    return buildPath(secondaryValues, height, CHART_WIDTH, true)
  }, [secondaryValues, height])
  const secondaryLinePath = useMemo(() => {
    if (!secondaryValues?.length) return ''
    return buildPath(secondaryValues, height, CHART_WIDTH, false)
  }, [secondaryValues, height])

  return (
    <div className={cn('min-w-0 w-full', className)}>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${height}`}
        className="h-auto w-full overflow-visible text-slate-900 dark:text-slate-100"
        preserveAspectRatio="none"
        role="img"
        aria-label="Chart trend"
      >
        <defs>
          <linearGradient id={`chart-fill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={PAD.left}
            x2={CHART_WIDTH - PAD.right}
            y1={PAD.top + (height - PAD.top - PAD.bottom) * ratio}
            y2={PAD.top + (height - PAD.top - PAD.bottom) * ratio}
            className="stroke-slate-200/80 dark:stroke-slate-800"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}
        {secondaryAreaPath ? (
          <path d={secondaryAreaPath} className={secondaryFillClass} />
        ) : null}
        {areaPath ? (
          <path d={areaPath} fill={`url(#chart-fill-${gradientId})`} className={fillClass} />
        ) : null}
        {secondaryLinePath ? (
          <path
            d={secondaryLinePath}
            fill="none"
            className={cn(secondaryStrokeClass, 'stroke-[2]')}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            className={cn(strokeClass, 'stroke-[2]')}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </svg>
      {labels.length > 0 ? (
        <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
          {labels.map((label) => (
            <span
              key={label}
              className="truncate text-center text-[10px] font-medium text-slate-400 dark:text-slate-500"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default MiniAreaChart
