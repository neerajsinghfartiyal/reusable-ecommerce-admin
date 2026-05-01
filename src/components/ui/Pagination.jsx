function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPrevious,
  onNext,
  disabled = false,
}) {
  const isPreviousDisabled = disabled || currentPage <= 1
  const isNextDisabled = disabled || currentPage >= totalPages

  return (
    <div className="admin-pagination">
      <button
        type="button"
        className="pagination-btn"
        onClick={onPrevious}
        disabled={isPreviousDisabled}
      >
        Previous
      </button>
      <p className="pagination-text">
        Page {currentPage} of {Math.max(1, totalPages)}
      </p>
      <button
        type="button"
        className="pagination-btn"
        onClick={onNext}
        disabled={isNextDisabled}
      >
        Next
      </button>
    </div>
  )
}

export default Pagination
