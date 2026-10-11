import type { AuditAction } from '@prisma/client';
import type { prisma } from '@/lib/db';

// Who did what to an order or to a customer's debt, and when. An entry is
// written in the same transaction as the change it describes and is never
// edited afterwards. The person's name is copied in, so the history still
// reads correctly after an account is renamed or removed.

/** The main client or the client of an open transaction. */
type AuditDb = Pick<typeof prisma, 'auditLog'>;

export type AuditActor = { factoryId: string; userId: string | null; userName: string };

export interface AuditEntry {
  action: AuditAction;
  /** One Vietnamese sentence the manager reads in the log */
  summary: string;
  orderId?: string;
  customerId?: string;
}

export function recordAudit(db: AuditDb, actor: AuditActor, entries: AuditEntry | AuditEntry[]) {
  return db.auditLog.createMany({
    data: [entries].flat().map((entry) => ({
      factoryId: actor.factoryId,
      userId: actor.userId,
      userName: actor.userName,
      action: entry.action,
      summary: entry.summary,
      orderId: entry.orderId ?? null,
      customerId: entry.customerId ?? null,
    })),
  });
}

/** The entries that change what a customer owes. */
export const DEBT_ACTIONS: AuditAction[] = ['ORDER_SETTLED', 'DEBT_PAYMENT'];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ giao',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const dong = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;

/** "Đá Bi 5kg × 3, Đá Viên 10kg × 2" */
export function describeLines(lines: Array<{ name: string; sizeKg: number; quantity: number }>): string {
  return lines.map((line) => `${line.name} ${line.sizeKg}kg × ${line.quantity}`).join(', ');
}

/** What settlement found: the lines delivered short or over, or "giao đủ". */
export function describeSettlement(
  lines: Array<{ name: string; sizeKg: number; ordered: number; delivered: number }>
): string {
  const changed = lines.filter((line) => line.delivered !== line.ordered);
  if (changed.length === 0) return 'giao đủ';
  return changed.map((line) => `${line.name} ${line.sizeKg}kg đặt ${line.ordered}, thực giao ${line.delivered}`).join('; ');
}
