import { z } from 'zod';
import { type ApiContract, Id, Success, envelope, roles } from './common';

export const priceContracts: ApiContract[] = [
  {
    id: 'listGlobalPrices',
    method: 'GET',
    path: '/api/prices/global',
    tag: 'Prices',
    summary: 'Every product with its default price, discontinued ones included',
    auth: roles('ADMIN'),
    response: envelope(
      z.array(
        z.object({
          id: Id,
          name: z.string(),
          sizeKg: z.number().int(),
          unit: z.string(),
          minStock: z.number().int().nullable(),
          isActive: z.boolean(),
          price: z.number().nullable(),
        })
      )
    ),
    errors: [400, 401, 403, 500],
    notes:
      'Feeds the manager\'s products-and-prices screen. Ordered by name then size. `price` is null for a product ' +
      'without a default price; `isActive` false for a product taken off sale.',
  },
  {
    id: 'setGlobalPrice',
    method: 'POST',
    path: '/api/prices/global',
    tag: 'Prices',
    summary: 'Set the default price of a product',
    auth: roles('ADMIN'),
    body: z.object({ productId: Id, price: z.number().positive() }),
    response: envelope(Success),
    errors: [400, 401, 403, 404, 500],
  },
  {
    id: 'setCustomerPrice',
    method: 'POST',
    path: '/api/prices/customer/override',
    tag: 'Prices',
    summary: 'Set a customer-specific price for a product',
    auth: roles('ADMIN'),
    body: z.object({ customerId: Id, productId: Id, price: z.number().positive() }),
    response: envelope(Success),
    errors: [400, 401, 403, 404, 500],
  },
  {
    id: 'removeCustomerPrice',
    method: 'DELETE',
    path: '/api/prices/customer/override',
    tag: 'Prices',
    summary: 'Remove a customer-specific price',
    auth: roles('ADMIN'),
    query: z.object({ customerId: Id, productId: Id }),
    response: envelope(Success),
    errors: [400, 401, 403, 404, 500],
  },
];
