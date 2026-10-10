import { z } from 'zod';
import { type ApiContract, Id, IsoDateTime, envelope, roles } from './common';

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
    summary: 'Stock on hand per active product',
    auth: roles('ADMIN'),
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
    errors: [400, 401, 403, 500],
    notes:
      'Stock is a running balance: the closing stock of one day is the opening stock of the next. ' +
      'A negative quantity means more was delivered than was ever recorded as produced.',
  },
  {
    id: 'recordInventory',
    method: 'POST',
    path: '/api/inventory',
    tag: 'Inventory',
    summary: 'Record a production batch or a stock count',
    auth: roles('ADMIN'),
    body: z.object({ productId: Id, quantity: z.number().int().min(0), mode: z.enum(['ADD', 'SET']).optional() }),
    response: envelope(InventoryRow),
    errors: [400, 401, 403, 404, 500],
    notes:
      'With `mode: "ADD"` (a production batch) the quantity is added to the stock on hand. Otherwise (`SET` or omitted) ' +
      'it is a stock count: the counted quantity replaces the balance. The returned row is today\'s closing balance.',
  },
];
