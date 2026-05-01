import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function AdminPagination({
  currentPage = 1,
  totalPages = 1,
  onPrevious,
  onNext,
  isPreviousDisabled = false,
  isNextDisabled = false,
  className = ""
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <Button variant="outline" size="sm" onClick={onPrevious} disabled={isPreviousDisabled}>
        Previous
      </Button>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        Page <span className="font-medium text-slate-900 dark:text-slate-100">{currentPage}</span> of{" "}
        <span className="font-medium text-slate-900 dark:text-slate-100">{totalPages}</span>
      </p>

      <Button variant="outline" size="sm" onClick={onNext} disabled={isNextDisabled}>
        Next
      </Button>
    </div>
  )
}

export default AdminPagination
