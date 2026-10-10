import { z } from 'zod';
import { type ApiContract, DateOnly, Id, OrderWithItems, envelope, roles } from './common';

export const driverContracts: ApiContract[] = [
  {
    id: 'listDriverOrders',
    method: 'GET',
    path: '/api/driver/orders',
    tag: 'Driver',
    summary: "A driver's SHIPPING and DELIVERED orders for one day",
    auth: roles('DRIVER'),
    query: z.object({ date: DateOnly.optional() }),
    response: envelope(
      z.object({
        driver: z.object({ id: Id, name: z.string() }),
        orders: z.array(OrderWithItems.extend({ driverName: z.string() })),
      })
    ),
    errors: [401, 403, 429, 500],
    notes: '`date` defaults to today. Rate limited to 60 per IP per minute.',
  },
];
