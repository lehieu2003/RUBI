// The factory runs on Vietnam time (UTC+7, no daylight saving). Servers often
// run on UTC, so "today" must never come from the server's local clock.

const OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Today's calendar date in Vietnam as YYYY-MM-DD. */
export function todayInVietnam(now: Date = new Date()): string {
  return new Date(now.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Current hour (0-23) in Vietnam. */
export function hourInVietnam(now: Date = new Date()): number {
  return new Date(now.getTime() + OFFSET_MS).getUTCHours();
}

/**
 * The instants bounding one Vietnam calendar day: `start` is 00:00 and `end`
 * is 00:00 of the next day (exclusive). Defaults to today. Returns null for a
 * value that is not a real YYYY-MM-DD date.
 */
export function vietnamDayRange(dateOnly: string = todayInVietnam()): { start: Date; end: Date } | null {
  if (!DATE_ONLY.test(dateOnly)) return null;
  const start = new Date(`${dateOnly}T00:00:00+07:00`);
  if (Number.isNaN(start.getTime())) return null;
  // Reject overflow such as 2026-02-31, which Date would silently roll over.
  if (todayInVietnam(start) !== dateOnly) return null;
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** Start of today in Vietnam. */
export function startOfVietnamToday(now: Date = new Date()): Date {
  return vietnamDayRange(todayInVietnam(now))!.start;
}
