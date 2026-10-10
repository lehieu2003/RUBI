import { z } from 'zod';
import { type ApiContract, Id, IsoDateTime, envelope, session } from './common';

const InventoryRow = z.object({
  id: Id,
  productId: Id,
  date: IsoDateTime,
  quantityOnHand: z.number().int(),
});

export const inventoryContracts: ApiContract[] = [
  {
    id: 'getInventory',
    method: 'GET',
    path: '/api/inventory',
    tag: 'Inventory',
    summary: "Today's stock per active product",
    auth: session,
    response: envelope(
      z.object({
        items: z.array(
          z.object({
            productId: Id,
            productName: z.string(),
            sizeKg: z.number().int(),
            unit: z.string(),
            quantityOnHand: z.number().int(),
            totalKg: z.number(),
          })
        ),
        totalBags: z.number().int(),
        totalKg: z.number(),
      })
    ),
    errors: [401, 500],
    notes: 'Any signed-in role can call it; the route does not check the role.',
  },
  {
    id: 'recordInventory',
    method: 'POST',
    path: '/api/inventory',
    tag: 'Inventory',
    summary: "Set or add to today's stock of a product",
    auth: session,
    body: z.object({ productId: Id, quantity: z.number().min(0), mode: z.enum(['ADD']).optional() }),
    response: envelope(InventoryRow),
    errors: [400, 401, 404, 500],
    notes:
      'With `mode: "ADD"` the quantity is added to today\'s record; otherwise it replaces it. ' +
      'Any signed-in role can call it; the route does not check the role.',
  },
];
