import { z } from 'zod';
import { type ApiContract, Id, IsoDateTime, envelope, paginated, paginationQuery, roles } from './common';

const InventoryRow = z.object({
  id: Id,
  productId: Id,
  date: IsoDateTime,
  quantityOnHand: z.number().int(),
});

const StockCountEntry = z.object({
  id: Id,
  productId: Id,
  productName: z.string(),
  sizeKg: z.number().int(),
  unit: z.string(),
  bookQuantity: z.number().int(),
  countedQuantity: z.number().int(),
  difference: z.number().int(),
  note: z.string().nullable(),
  countedByName: z.string().nullable(),
  createdAt: IsoDateTime,
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
    body: z.object({
      productId: Id,
      quantity: z.number().int().min(0),
      mode: z.enum(['ADD', 'SET']).optional(),
      note: z.string().trim().max(200).optional(),
    }),
    response: envelope(InventoryRow),
    errors: [400, 401, 403, 404, 500],
    notes:
      'With `mode: "ADD"` (a production batch) the quantity is added to the stock on hand. Otherwise (`SET` or omitted) ' +
      'it is a stock count: the counted quantity replaces the balance and the count is kept in the history together with ' +
      'the optional `note`. The returned row is today\'s closing balance.',
  },
  {
    id: 'listStockCounts',
    method: 'GET',
    path: '/api/inventory/counts',
    tag: 'Inventory',
    summary: 'History of stock counts, newest first, paginated',
    auth: roles('ADMIN'),
    query: z.object(paginationQuery),
    response: paginated(StockCountEntry),
    errors: [400, 401, 403, 500],
    notes:
      '`difference` is `countedQuantity - bookQuantity`: negative is a loss (melting, breakage), positive a surplus. ' +
      '`countedByName` is null when the account that counted no longer exists.',
  },
];
