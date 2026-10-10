'use client';

// Date and month pickers with Vietnamese labels. The browser's native date
// and month inputs follow the browser language, so on most office machines
// they showed English month names and mm/dd/yyyy.

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const pad = (value: number) => String(value).padStart(2, '0');

function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 2026-10-05 -> 05/10/2026 */
function formatDateVi(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
}

/** 2026-10 -> Tháng 10/2026 */
function formatMonthVi(value: string): string {
  const [year, month] = value.split('-');
  return year && month ? `Tháng ${Number(month)}/${year}` : '';
}

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

const triggerClass =
  'flex w-full items-center justify-between gap-2 rounded border border-outline-variant bg-card px-3 text-sm text-on-surface hover:border-primary-accent focus:border-primary-accent focus:outline-none';
const navClass =
  'flex h-8 w-8 items-center justify-center rounded text-on-surface-variant hover:bg-container-high';
const panelClass =
  'absolute z-50 mt-1 w-[280px] rounded border border-outline-variant bg-card p-3 shadow-lg';

type DatePickerProps = {
  /** YYYY-MM-DD, or '' when nothing is chosen */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Show the "Xoá" action so the date can be emptied (filters, optional fields) */
  clearable?: boolean;
  ariaLabel?: string;
  className?: string;
  /** Which edge of the field the calendar lines up with; use 'right' near the right screen edge */
  align?: 'left' | 'right';
};

export function DatePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày',
  clearable = false,
  ariaLabel,
  className = 'h-[42px]',
  align = 'left',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => (value || todayLocal()).slice(0, 7));
  const ref = useDismiss(open, () => setOpen(false));

  const [viewYear, viewMonth] = view.split('-').map(Number);
  const today = todayLocal();
  // Monday-first: how many empty cells come before day 1.
  const leading = (new Date(viewYear, viewMonth - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth - 1 + delta, 1);
    setView(`${next.getFullYear()}-${pad(next.getMonth() + 1)}`);
  };
  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setView((value || todayLocal()).slice(0, 7));
          setOpen((current) => !current);
        }}
        className={`${triggerClass} ${className}`}
      >
        <span className={value ? 'font-mono' : 'text-faint'}>{value ? formatDateVi(value) : placeholder}</span>
        <Calendar className="h-4 w-4 shrink-0 text-on-surface-variant" />
      </button>

      {open && (
        <div role="dialog" aria-label="Chọn ngày" className={`${panelClass} ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} className={navClass} aria-label="Tháng trước">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-on-surface">
              Tháng {viewMonth}, {viewYear}
            </span>
            <button type="button" onClick={() => shiftMonth(1)} className={navClass} aria-label="Tháng sau">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((label) => (
              <span key={label} className="py-1 text-[11px] font-bold text-on-surface-variant">
                {label}
              </span>
            ))}
            {Array.from({ length: leading }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const date = `${view}-${pad(index + 1)}`;
              const selected = date === value;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => pick(date)}
                  aria-label={`Ngày ${formatDateVi(date)}`}
                  aria-pressed={selected}
                  className={`h-9 rounded text-sm font-mono transition-colors ${
                    selected
                      ? 'bg-[#004a99] font-bold text-white'
                      : date === today
                        ? 'border border-primary-accent font-bold text-primary-accent hover:bg-container-high'
                        : 'text-on-surface hover:bg-container-high'
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-outline-soft pt-2 text-xs font-bold">
            <button type="button" onClick={() => pick(today)} className="text-primary-accent hover:underline">
              Hôm nay
            </button>
            {clearable && (
              <button type="button" onClick={() => pick('')} className="text-on-surface-variant hover:underline">
                Xoá
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type MonthPickerProps = {
  /** YYYY-MM */
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
};

export function MonthPicker({ value, onChange, ariaLabel = 'Chọn tháng' }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [year, month] = value.split('-').map(Number);
  const [viewYear, setViewYear] = useState(year);
  const ref = useDismiss(open, () => setOpen(false));

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1);
    onChange(`${next.getFullYear()}-${pad(next.getMonth() + 1)}`);
  };

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      <button
        type="button"
        onClick={() => shiftMonth(-1)}
        className="flex h-9 w-9 items-center justify-center rounded border border-outline-variant bg-card text-on-surface-variant hover:bg-container-high"
        aria-label="Tháng trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setViewYear(year);
          setOpen((current) => !current);
        }}
        className={`${triggerClass} h-9 min-w-[150px] font-bold`}
      >
        <span>{formatMonthVi(value)}</span>
        <Calendar className="h-4 w-4 shrink-0 text-on-surface-variant" />
      </button>
      <button
        type="button"
        onClick={() => shiftMonth(1)}
        className="flex h-9 w-9 items-center justify-center rounded border border-outline-variant bg-card text-on-surface-variant hover:bg-container-high"
        aria-label="Tháng sau"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {open && (
        <div role="dialog" aria-label="Chọn tháng" className={`${panelClass} left-0 top-full`}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setViewYear((current) => current - 1)} className={navClass} aria-label="Năm trước">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-on-surface">Năm {viewYear}</span>
            <button type="button" onClick={() => setViewYear((current) => current + 1)} className={navClass} aria-label="Năm sau">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }, (_, index) => {
              const selected = viewYear === year && index + 1 === month;
              return (
                <button
                  key={index}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(`${viewYear}-${pad(index + 1)}`);
                    setOpen(false);
                  }}
                  className={`h-9 rounded text-sm transition-colors ${
                    selected ? 'bg-[#004a99] font-bold text-white' : 'text-on-surface hover:bg-container-high'
                  }`}
                >
                  Tháng {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
