import { z } from 'zod';
import {
  type ApiContract,
  DateOnly,
  Id,
  OrderRow,
  OrderStatus,
  OrderWithItems,
  Success,
  envelope,
  roles,
} from './common';

const orderId = z.object({ id: Id });

export const orderContracts: ApiContract[] = [
  {
    id: 'listOrders',
    method: 'GET',
    path: '/api/orders',
    tag: 'Orders',
    summary: 'Orders with customer, driver and items, newest first',
    auth: roles('ADMIN', 'STAFF'),
    query: z.object({
      customerId: Id.optional(),
      status: OrderStatus.optional(),
      date: DateOnly.optional(),
    }),
    response: envelope(
      z.array(OrderWithItems.extend({ driver: z.object({ id: Id, name: z.string() }).nullable() }))
    ),
    errors: [400, 401, 403, 500],
    notes: 'An unknown `status` value is ignored rather than rejected. `date` filters on the creation day.',
  },
  {
    id: 'updateOrderStatus',
    method: 'PATCH',
    path: '/api/orders/{id}/status',
    tag: 'Orders',
    summary: 'Change an order status (not to COMPLETED)',
    auth: roles('ADMIN', 'STAFF'),
    params: orderId,
    body: z.object({
      status: z.enum(['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED']),
      cancellationReason: z.string().optional(),
    }),
    response: envelope(OrderRow),
    errors: [400, 401, 403, 404, 500],
    notes:
      '`cancellationReason` is required when the status is CANCELLED and is stored in `notes`. ' +
      'COMPLETED is only reached through reconciliation. `total` comes back as a decimal string here.',
  },
  {
    id: 'bulkAssignOrders',
    method: 'PATCH',
    path: '/api/orders/bulk-assign',
    tag: 'Orders',
    summary: 'Assign several orders to a driver',
    auth: roles('ADMIN'),
    body: z.object({ orderIds: z.array(Id).min(1), driverId: Id }),
    response: envelope(
      Success.extend({ assignedCount: z.number().int(), driver: z.object({ id: Id, name: z.string() }) })
    ),
    errors: [400, 401, 403, 404, 500],
    notes: 'Only PENDING and SHIPPING orders are assigned; others are skipped and not counted.',
  },
  {
    id: 'confirmDelivery',
    method: 'PATCH',
    path: '/api/orders/{id}/confirm',
    tag: 'Orders',
    summary: 'Driver confirms an order as delivered',
    auth: {
      kind: 'custom',
      description:
        'The assigned driver: a DRIVER session (cookie or Bearer JWT), or the driver share-link token ' +
        'sent as `Authorization: Bearer <token>` or as `token` in the body.',
    },
    params: orderId,
    body: z.object({ token: z.string().optional() }).optional(),
    response: envelope(Success.extend({ orderId: Id, status: z.literal('DELIVERED') })),
    errors: [401, 403, 404, 500],
    notes: 'The body may be empty. Sets `deliveredAt`. No location is captured.',
  },
  {
    id: 'reconcileOrder',
    method: 'PATCH',
    path: '/api/orders/{id}/reconcile',
    tag: 'Orders',
    summary: 'Settle a delivered order: actual quantities, debt and stock',
    auth: roles('ADMIN'),
    params: orderId,
    body: z.object({ items: z.array(z.object({ id: Id, actualQty: z.number().int().min(0) })).min(1) }),
    response: envelope(Success.extend({ orderId: Id, status: z.literal('COMPLETED') })),
    errors: [400, 401, 403, 500],
    notes:
      'Only a DELIVERED order can be reconciled. A missing order or a wrong status is reported as 500 ' +
      '("Đối soát thất bại"), not 404/409. Creates a DEBT ledger entry and deducts today\'s inventory.',
  },
];
