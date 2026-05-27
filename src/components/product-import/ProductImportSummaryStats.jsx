import { cn } from '@/lib/utils'

const statItems = [
  { key: 'valid', label: 'Valid', valueKey: 'validRows', tone: 'valid' },
  { key: 'errors', label: 'Errors', valueKey: 'errorRows', tone: 'error' },
  { key: 'warnings', label: 'Warnings', valueKey: 'warningRows', tone: 'warning' },
  { key: 'mapping', label: 'Needs mapping', valueKey: 'unresolvedRows', tone: 'neutral', fromSummary: true },
]

const toneClass = {
  valid: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
  error: 'border-red-200/80 bg-red-50/80 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200',
  warning: 'border-amber-200/80 bg-amber-50/80 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
  neutral: 'border-slate-200/80 bg-slate-50/80 text-slate-800 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200',
}

function ProductImportSummaryStats({ previewResult }) {
  if (!previewResult) return null

  const duplicateSummary = previewResult.duplicateSummary || {}

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {statItems.map((item) => {
        const value = item.fromSummary
          ? duplicateSummary.unresolvedRows ?? 0
          : previewResult[item.valueKey] ?? 0

        return (
          <div
            key={item.key}
            className={cn(
              'rounded-lg border px-3 py-2.5',
              toneClass[item.tone],
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{item.label}</p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums leading-none">{value}</p>
          </div>
        )
      })}
    </div>
  )
}

export default ProductImportSummaryStats
