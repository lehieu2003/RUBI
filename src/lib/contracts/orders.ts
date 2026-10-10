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
  paginated,
  paginationQuery,
  roles,
} from './common';

const orderId = z.object({ id: Id });

/** Filters shared by the order list and the order counts. */
const orderFilters = {
  customerId: Id.optional(),
  driverId: z.string().optional().meta({ description: 'A driver id, or "unassigned" for orders without a driver' }),
  date: DateOnly.optional(),
  completedDate: DateOnly.optional(),
  q: z.string().optional().meta({ description: 'Customer name or code, or an order code such as DH-JI9A6Q' }),
};

export const orderContracts: ApiContract[] = [
  {
    id: 'listOrders',
    method: 'GET',
    path: '/api/orders',
    tag: 'Orders',
    summary: 'Orders with customer, driver and items, newest first, paginated',
    auth: roles('ADMIN', 'STAFF'),
    query: z.object({ ...orderFilters, status: OrderStatus.optional(), ...paginationQuery }),
    response: paginated(OrderWithItems.extend({ driver: z.object({ id: Id, name: z.string() }).nullable() })),
    errors: [400, 401, 403, 500],
    notes:
      'An unknown `status` value is ignored rather than rejected. `date` is a Vietnam calendar day and filters on the ' +
      'creation time; `completedDate` filters on the day the order was settled. 400 for a malformed `date` or ' +
      '`completedDate`, or a `page`/`limit` that is not a positive integer or exceeds the maximum.',
  },
  {
    id: 'getOrderCounts',
    method: 'GET',
    path: '/api/orders/counts',
    tag: 'Orders',
    summary: 'Number of orders per status under the same filters as the list',
    auth: roles('ADMIN', 'STAFF'),
    query: z.object(orderFilters),
    response: envelope(
      z.object({
        total: z.number().int(),
        byStatus: z.object({
          PENDING: z.number().int(),
          SHIPPING: z.number().int(),
          DELIVERED: z.number().int(),
          COMPLETED: z.number().int(),
          CANCELLED: z.number().int(),
        }),
      })
    ),
    errors: [400, 401, 403, 500],
    notes: 'Feeds the status tabs of the order list, which cannot count from a single page.',
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
    errors: [400, 401, 403, 404, 409, 500],
    notes:
      '`cancellationReason` is required when the status is CANCELLED and is stored in `notes`. ' +
      'COMPLETED is only reached through reconciliation. A COMPLETED or CANCELLED order is final: 409 `ORDER_FINAL`.',
  },
  {
    id: 'bulkAssignOrders',
    method: 'PATCH',
    path: '/api/orders/bulk-assign',
    tag: 'Orders',
    summary: 'Assign several orders to a driver',
    auth: roles('ADMIN', 'STAFF'),
    body: z.object({ orderIds: z.array(Id).min(1), driverId: Id }),
    response: envelope(
      Success.extend({ assignedCount: z.number().int(), driver: z.object({ id: Id, name: z.string() }) })
    ),
    errors: [400, 401, 403, 404, 500],
    notes:
      'Only PENDING and SHIPPING orders are assigned; others are skipped and not counted. ' +
      '404 when the driver does not exist or is deactivated.',
  },
  {
    id: 'confirmDelivery',
    method: 'PATCH',
    path: '/api/orders/{id}/confirm',
    tag: 'Orders',
    summary: 'Driver confirms an order as delivered',
    auth: roles('DRIVER'),
    params: orderId,
    response: envelope(Success.extend({ orderId: Id, status: z.literal('DELIVERED') })),
    errors: [401, 403, 404, 409, 500],
    notes:
      'No request body. The signed-in driver must be the one the order is assigned to (403 otherwise). ' +
      'Only a SHIPPING order is confirmed: 409 `ORDER_NOT_SHIPPING` otherwise, except an already DELIVERED order, ' +
      'which answers success unchanged. Sets `deliveredAt`. No location is captured.',
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
    errors: [400, 401, 403, 404, 409, 500],
    notes:
      '404 when the order does not exist; 409 `ORDER_NOT_DELIVERED` unless it is DELIVERED; 400 when a line does not ' +
      'belong to the order. Creates a DEBT ledger entry and deducts the delivered quantities from the stock on hand.',
  },
];
