import { z } from 'zod';
import { type ApiContract, Id, IsoDateTime, paginated, paginationQuery, roles } from './common';

export const AuditAction = z.enum([
  'ORDER_CREATED',
  'ORDER_ASSIGNED',
  'ORDER_STATUS_CHANGED',
  'ORDER_CANCELLED',
  'ORDER_DELIVERED',
  'ORDER_SETTLED',
  'DEBT_PAYMENT',
]);

const AuditLogEntry = z.object({
  id: Id,
  action: AuditAction,
  summary: z.string(),
  userName: z.string(),
  orderId: Id.nullable(),
  orderCode: z.string().nullable(),
  customerId: Id.nullable(),
  customerName: z.string().nullable(),
  createdAt: IsoDateTime,
});

export const auditContracts: ApiContract[] = [
  {
    id: 'listAuditLogs',
    method: 'GET',
    path: '/api/audit-logs',
    tag: 'Audit',
    summary: 'Who changed which order or debt, newest first, paginated',
    auth: roles('ADMIN'),
    query: z.object({
      type: z.enum(['ORDER', 'DEBT']).optional(),
      orderId: Id.optional(),
      customerId: Id.optional(),
      ...paginationQuery,
    }),
    response: paginated(AuditLogEntry),
    errors: [400, 401, 403, 500],
    notes:
      'An entry is written with every change to an order (taken, assigned, status changed, cancelled, delivered, ' +
      'settled) and with every payment recorded against a customer\'s debt. `type=ORDER` keeps the entries about an ' +
      'order; `type=DEBT` keeps the ones that change what a customer owes (`ORDER_SETTLED`, `DEBT_PAYMENT`). ' +
      '`userName` is the name the person had at the time. `summary` is a Vietnamese sentence meant for reading.',
  },
];
