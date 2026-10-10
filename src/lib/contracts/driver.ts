import { z } from 'zod';
import { type ApiContract, DateOnly, Id, OrderWithItems, envelope } from './common';

export const driverContracts: ApiContract[] = [
  {
    id: 'listDriverOrders',
    method: 'GET',
    path: '/api/driver/orders',
    tag: 'Driver',
    summary: "A driver's SHIPPING and DELIVERED orders for one day",
    auth: {
      kind: 'custom',
      description: 'A DRIVER session, or the driver share-link token in the `token` query parameter.',
    },
    query: z.object({ token: z.string().optional(), date: DateOnly.optional() }),
    response: envelope(
      z.object({
        driver: z.object({ id: Id, name: z.string() }),
        orders: z.array(OrderWithItems.extend({ driverName: z.string() })),
      })
    ),
    errors: [401, 403, 429, 500],
    notes: '`date` defaults to today. Rate limited to 60 per IP per minute.',
  },
  {
    id: 'getDriverLink',
    method: 'GET',
    path: '/api/d/{token}',
    tag: 'Driver',
    summary: "Today's orders behind a driver share link",
    auth: { kind: 'custom', description: 'The share-link token in the path; no session.' },
    params: z.object({ token: z.string() }),
    response: z.object({
      driverName: z.string(),
      orders: z.array(
        z.object({
          id: Id,
          status: z.enum(['SHIPPING', 'DELIVERED']),
          total: z.number(),
          customer: z.object({
            id: Id,
            code: z.string(),
            name: z.string(),
            address: z.string(),
            phone: z.string(),
          }),
          orderItems: z.array(
            z.object({
              quantity: z.number().int(),
              product: z.object({ name: z.string(), sizeKg: z.number().int() }),
            })
          ),
        })
      ),
    }),
    errors: [404, 429, 500],
    notes:
      'Returned WITHOUT the `{ success, data }` envelope; errors are `{ error }`. ' +
      'Rate limited to 30 per IP per minute.',
  },
];
