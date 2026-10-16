type MaintenanceRecordDue = { type: string; performedAt: Date; dueAt: Date | null };

/**
 * What an asset is due for now: for each maintenance type, the due date of its
 * latest record (by performedAt), soonest first. A maintenance done again
 * replaces the due date of the one before it; a latest record without a due
 * date leaves nothing due for that type. On the same performedAt the record
 * later in the list wins, so pass them oldest entry first.
 */
export function currentDueDates<T extends MaintenanceRecordDue>(records: T[]): (T & { dueAt: Date })[] {
  const latest = new Map<string, T>();
  for (const record of records) {
    const seen = latest.get(record.type);
    if (!seen || record.performedAt >= seen.performedAt) latest.set(record.type, record);
  }
  return [...latest.values()]
    .filter((record): record is T & { dueAt: Date } => record.dueAt !== null)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}
