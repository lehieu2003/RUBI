import { z } from 'zod';
import { type ApiContract, Id, Success, envelope, roles } from './common';

/**
 * A price in whole VND: payments are whole VND, so a fractional price could never be paid off.
 * Capped like a new product's price, so a price and the order lines built from it fit the money columns.
 */
export const Price = z
  .number()
  .int('Giá phải là số nguyên (VND)')
  .positive('Giá phải lớn hơn 0')
  .max(99_999_999, 'Giá tối đa 99.999.999đ');

/** Body of POST /api/prices/global; the route validates with this schema. */
export const GlobalPriceBody = z.object({ productId: Id, price: Price });

/** Body of POST /api/prices/customer/override; the route validates with this schema. */
export const CustomerPriceBody = z.object({ customerId: Id, productId: Id, price: Price });

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
    body: GlobalPriceBody,
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
    body: CustomerPriceBody,
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
