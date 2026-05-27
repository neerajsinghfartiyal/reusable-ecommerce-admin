import { Loader2, X } from 'lucide-react'
import AdminSelect from '@/components/admin-ui/AdminSelect'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const BULK_ACTION_OPTIONS = [
  { value: '', label: 'Choose bulk action…' },
  { value: 'delete', label: 'Delete selected' },
  { value: 'draft', label: 'Set status to Draft' },
  { value: 'published', label: 'Set status to Published' },
  { value: 'inactive', label: 'Set status to Inactive' },
]

function ProductBulkActions({
  selectedCount = 0,
  bulkAction = '',
  onBulkActionChange,
  onApply,
  onClearSelection,
  onQuickAction,
  isProcessing = false,
  className = '',
}) {
  if (selectedCount <= 0) {
    return null
  }

  const label =
    selectedCount === 1 ? '1 product selected' : `${selectedCount} products selected`

  const canApply = Boolean(bulkAction) && selectedCount > 0 && !isProcessing

  const handleQuick = (action) => {
    if (isProcessing || typeof onQuickAction !== 'function') return
    onQuickAction(action)
  }

  return (
    <div
      className={cn(
        'product-bulk-toolbar flex flex-col gap-3 rounded-xl border border-slate-900/10 bg-slate-900 px-4 py-3.5 text-white shadow-md',
        'dark:border-slate-700 dark:bg-slate-900/95',
        'sm:flex-row sm:flex-wrap sm:items-center',
        className,
      )}
      role="region"
      aria-label="Bulk product actions"
      aria-live="polite"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-white/15 px-2.5 py-1 text-xs font-bold tabular-nums"
          aria-hidden
        >
          {selectedCount}
        </span>
        <p className="min-w-0 text-sm font-semibold text-white">{label}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 border-0 bg-white/15 text-white hover:bg-white/25 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          disabled={isProcessing}
          onClick={() => handleQuick('draft')}
        >
          Draft
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 border-0 bg-white/15 text-white hover:bg-white/25 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          disabled={isProcessing}
          onClick={() => handleQuick('published')}
        >
          Published
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 border-0 bg-white/15 text-white hover:bg-white/25 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          disabled={isProcessing}
          onClick={() => handleQuick('inactive')}
        >
          Inactive
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="h-8"
          disabled={isProcessing}
          onClick={() => handleQuick('delete')}
        >
          Delete
        </Button>
      </div>

      <div className="flex w-full flex-col gap-2 border-t border-white/10 pt-3 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:border-0 sm:pt-0 dark:border-slate-700">
        <AdminSelect
          value={bulkAction}
          onChange={onBulkActionChange}
          aria-label="Bulk action"
          className="min-w-0 flex-1 border-white/20 bg-white/10 text-white sm:min-w-[200px] sm:max-w-[240px] dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100"
          disabled={isProcessing}
        >
          {BULK_ACTION_OPTIONS.map((option) => (
            <option key={option.value || 'placeholder'} value={option.value}>
              {option.label}
            </option>
          ))}
        </AdminSelect>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 shrink-0 border-0 bg-white text-slate-900 hover:bg-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          disabled={!canApply}
          onClick={onApply}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Applying…
            </>
          ) : (
            'Apply'
          )}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 text-white/90 hover:bg-white/10 hover:text-white dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          onClick={onClearSelection}
          disabled={isProcessing}
          aria-label="Clear selection"
        >
          <X className="mr-1 h-3.5 w-3.5" aria-hidden />
          Clear
        </Button>
      </div>
    </div>
  )
}

export default ProductBulkActions
