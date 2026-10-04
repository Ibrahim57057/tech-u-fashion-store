import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Pure display: it knows the current page and total pages, and reports
 * a click upward through onPageChange. It never fetches data itself,
 * same principle as FilterSidebar — the parent owns the real state.
 */
export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className='flex items-center justify-center gap-2 mt-6'>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className='p-2 rounded-card border border-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100'
        aria-label='Previous page'>
        <ChevronLeft className='w-4 h-4' />
      </button>

      <span className='text-sm text-neutral-600'>
        Page {page} of {totalPages}
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className='p-2 rounded-card border border-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100'
        aria-label='Next page'>
        <ChevronRight className='w-4 h-4' />
      </button>
    </div>
  );
}
