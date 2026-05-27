import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, label: 'Upload file' },
  { id: 2, label: 'Review preview' },
  { id: 3, label: 'Run import' },
]

function ProductImportStepper({ currentStep = 1, compact = false }) {
  return (
    <nav aria-label="Import progress" className="product-import-stepper min-w-0">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, index) => {
          const isActive = currentStep === step.id
          const isComplete = currentStep > step.id

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center">
              <div
                className={cn(
                  'flex min-w-0 items-center gap-1.5',
                  compact ? 'text-[11px]' : 'text-xs',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-1 ring-inset',
                    isActive &&
                      'bg-slate-900 text-white ring-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-100',
                    isComplete &&
                      'bg-emerald-600 text-white ring-emerald-600 dark:bg-emerald-500 dark:ring-emerald-500',
                    !isActive &&
                      !isComplete &&
                      'bg-white text-slate-500 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700',
                  )}
                >
                  {isComplete ? '✓' : step.id}
                </span>
                <span
                  className={cn(
                    'truncate font-medium',
                    isActive && 'text-slate-900 dark:text-slate-50',
                    isComplete && 'text-emerald-800 dark:text-emerald-300',
                    !isActive && !isComplete && 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <span
                  className={cn(
                    'mx-2 h-px flex-1',
                    isComplete ? 'bg-emerald-300 dark:bg-emerald-800' : 'bg-slate-200 dark:bg-slate-700',
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default ProductImportStepper
