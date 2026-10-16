/**
 * The note of a cancelled order: what was noted before, then the reason on
 * its own line, so the delivery instructions are not lost.
 */
export function withCancelReason(notes: string | null, reason: string): string {
  const tag = `[HỦY: ${reason}]`;
  return notes?.trim() ? `${notes}\n${tag}` : tag;
}
