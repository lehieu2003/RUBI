'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { pageRange, pageWindow, type PaginationMeta } from '@/lib/pagination';

type PaginationProps = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  /** Noun for the summary line, e.g. "đơn" */
  itemLabel?: string;
  disabled?: boolean;
};

export function Pagination({ meta, onPageChange, itemLabel = 'mục', disabled = false }: PaginationProps) {
  if (meta.total_item === 0) return null;

  const { first, last } = pageRange(meta);
  const buttonClass =
    'flex h-9 min-w-9 items-center justify-center rounded border border-outline-variant bg-card px-2 text-xs font-bold text-on-surface-variant hover:bg-container-high disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-col gap-3 border-t border-outline-variant px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-xs text-on-surface-variant">
        Hiển thị <span className="font-bold text-on-surface">{first}–{last}</span> trong{' '}
        <span className="font-bold text-on-surface">{meta.total_item.toLocaleString('vi-VN')}</span> {itemLabel}
      </p>

      {meta.total_page > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={buttonClass}
            disabled={disabled || meta.page <= 1}
            onClick={() => onPageChange(meta.page - 1)}
            aria-label="Trang trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageWindow(meta.page, meta.total_page).map((page, index) =>
            page === null ? (
              <span key={`gap-${index}`} className="px-1 text-xs text-faint">
                …
              </span>
            ) : (
              <button
                key={page}
                type="button"
                disabled={disabled}
                onClick={() => onPageChange(page)}
                aria-label={`Trang ${page}`}
                aria-current={page === meta.page ? 'page' : undefined}
                className={
                  page === meta.page
                    ? 'flex h-9 min-w-9 items-center justify-center rounded bg-[#004a99] px-2 text-xs font-bold text-white'
                    : buttonClass
                }
              >
                {page}
              </button>
            )
          )}
          <button
            type="button"
            className={buttonClass}
            disabled={disabled || meta.page >= meta.total_page}
            onClick={() => onPageChange(meta.page + 1)}
            aria-label="Trang sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </nav>
  );
}
