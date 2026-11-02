type ProductPaginationProps = {
  page: number
  hasMore: boolean
  loading: boolean
  onPageChange: (page: number) => void
}

export function ProductPagination({
  page,
  hasMore,
  loading,
  onPageChange,
}: ProductPaginationProps) {
  return (
    <nav className="catalog-pagination" aria-label="Product pagination">
      <button
        className="button button-light"
        type="button"
        disabled={page === 1 || loading}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        Previous
      </button>

      <span aria-live="polite">Page {page}</span>

      <button
        className="button button-light"
        type="button"
        disabled={!hasMore || loading}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </nav>
  )
}
