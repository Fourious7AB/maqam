// Simple responsive pagination bar for paginated stock lists.
export default function StockPagination({ pagination, onPageChange, disabled = false }) {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const { page = 1, totalPages = 1, total = 0 } = pagination;

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row">
      <p className="text-xs text-slate-500">
        Page <span className="font-bold text-slate-700">{page}</span> of{" "}
        <span className="font-bold text-slate-700">{totalPages}</span>
        {" · "}
        {total} record{total === 1 ? "" : "s"}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
