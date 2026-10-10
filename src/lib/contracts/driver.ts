import { z } from 'zod';
import { type ApiContract, DateOnly, Id, OrderWithItems, envelope, roles } from './common';

export const driverContracts: ApiContract[] = [
  {
    id: 'listDriverOrders',
    method: 'GET',
    path: '/api/driver/orders',
    tag: 'Driver',
    summary: "A driver's open SHIPPING orders and the orders DELIVERED on one day",
    auth: roles('DRIVER'),
    query: z.object({ date: DateOnly.optional() }),
    response: envelope(
      z.object({
        driver: z.object({ id: Id, name: z.string() }),
        orders: z.array(OrderWithItems.extend({ driverName: z.string() })),
      })
    ),
    errors: [400, 401, 403, 429, 500],
    notes:
      '`date` is a Vietnam calendar day and defaults to today; 400 when malformed. SHIPPING orders are listed whatever ' +
      'day they were taken (up to that day); DELIVERED orders only when delivered that day. Rate limited to 60 per IP per minute.',
  },
];
