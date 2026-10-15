import { z } from 'zod';
import { type ApiContract, DateOnly, Id, IsoDateTime, envelope, paginated, paginationQuery, roles } from './common';

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

/** Filters shared by the stock count history and its summary. */
const stockCountFilters = {
  productId: Id.optional(),
  from: DateOnly.optional(),
  to: DateOnly.optional(),
};

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
            sellable: z.number().int(),
            outForDelivery: z.number().int(),
            minStock: z.number().int().nullable(),
            lowStock: z.boolean(),
          })
        ),
        totalBags: z.number().int(),
        totalKg: z.number(),
      })
    ),
    errors: [400, 401, 403, 500],
    notes:
      'Stock is a running balance: the closing stock of one day is the opening stock of the next. ' +
      'A negative quantity means more was delivered than was ever recorded as produced. `sellable` is the stock on ' +
      'hand minus what orders that are not settled yet already took; `lowStock` is true when the product has an alert ' +
      'level (`minStock`) and `sellable` is at or below it. `outForDelivery` is what orders that are SHIPPING or ' +
      'DELIVERED but not settled yet hold: still on the books, no longer in the cold store.',
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
    errors: [400, 401, 403, 404, 422, 500],
    idempotent: true,
    notes:
      'With `mode: "ADD"` (a production batch) the quantity is added to the stock on hand. Otherwise (`SET` or omitted) ' +
      'it is a stock count of what is physically in the cold store. Units of orders that are SHIPPING or DELIVERED but ' +
      'not settled yet are not in the store but stay on the books until settlement, so the new balance is the counted ' +
      'quantity plus those units, and the count is kept in the history (compared with the books minus those units) ' +
      'together with the optional `note`. The returned row is today\'s closing balance. ' +
      'Send `Idempotency-Key` (one per submission, reused on resend) so a resent request is written once; ' +
      '422 `IDEMPOTENCY_KEY_REUSED` when the key was used for a different request.',
  },
  {
    id: 'listStockCounts',
    method: 'GET',
    path: '/api/inventory/counts',
    tag: 'Inventory',
    summary: 'History of stock counts, newest first, paginated',
    auth: roles('ADMIN'),
    query: z.object({ ...stockCountFilters, ...paginationQuery }),
    response: paginated(StockCountEntry),
    errors: [400, 401, 403, 500],
    notes:
      '`bookQuantity` is what should have been in the cold store at the count: the books minus the units of orders ' +
      'out for delivery (SHIPPING or DELIVERED, not settled yet). ' +
      '`difference` is `countedQuantity - bookQuantity`: negative is a loss (melting, breakage), positive a surplus. ' +
      '`countedByName` is null when the account that counted no longer exists. `from` and `to` are Vietnam calendar ' +
      'days, both inclusive; 400 when one is malformed or `from` is after `to`.',
  },
  {
    id: 'getStockCountSummary',
    method: 'GET',
    path: '/api/inventory/counts/summary',
    tag: 'Inventory',
    summary: 'Total loss and surplus over the stock counts matching the history filters',
    auth: roles('ADMIN'),
    query: z.object(stockCountFilters),
    response: envelope(
      z.object({ counts: z.number().int(), totalLoss: z.number().int(), totalSurplus: z.number().int() })
    ),
    errors: [400, 401, 403, 500],
    notes:
      '`totalLoss` adds up the counts that found less than the books, `totalSurplus` those that found more; both are ' +
      'positive numbers of units. Same filters and the same 400 as the history.',
  },
];
