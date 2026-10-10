// Shared date/shift helpers for the schedule API routes.

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const SHIFTS = [
  'SLOT_00_03',
  'SLOT_03_06',
  'SLOT_06_09',
  'SLOT_09_12',
  'SLOT_12_15',
  'SLOT_15_18',
  'SLOT_18_21',
  'SLOT_21_24',
] as const;

/** Every shift slot is three hours long. */
export const SHIFT_HOURS = 3;

export function parseDateOnly(value: string | null): Date | null {
  if (!value || !DATE_ONLY_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar date at the factory (Vietnam, UTC+7) as YYYY-MM-DD. */
export function todayInVietnam(now: Date = new Date()): string {
  return toDateOnly(new Date(now.getTime() + 7 * 60 * 60 * 1000));
}
