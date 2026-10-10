import { z } from 'zod';
import {
  type ApiContract,
  Customer,
  DecimalString,
  Id,
  IsoDateTime,
  OrderRow,
  Product,
  Success,
  envelope,
  roles,
  session,
} from './common';

const FactoryProfile = z.object({
  name: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  maxStaffPerShift: z.number().int().nullable(),
  maxDriversPerShift: z.number().int().nullable(),
});

const DebtLedgerEntry = z.object({
  id: Id,
  customerId: Id,
  type: z.enum(['DEBT', 'PAYMENT']),
  amount: DecimalString,
  notes: z.string().nullable(),
  createdAt: IsoDateTime,
});

const ShellDepositRow = z.object({
  id: Id,
  customerId: Id,
  shellsOut: z.number().int(),
  shellsIn: z.number().int(),
  depositPerShell: DecimalString,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

const InventoryRow = z.object({
  id: Id,
  productId: Id,
  date: IsoDateTime,
  quantityOnHand: z.number().int(),
});

export const catalogContracts: ApiContract[] = [
  // ---- Factory profile ----
  {
    id: 'getFactory',
    method: 'GET',
    path: '/api/factory',
    tag: 'Factory',
    summary: 'Factory profile and shift self-registration limits',
    auth: roles('ADMIN'),
    response: envelope(z.object({ factory: FactoryProfile })),
    errors: [400, 401, 403, 404, 500],
  },
  {
    id: 'updateFactory',
    method: 'PATCH',
    path: '/api/factory',
    tag: 'Factory',
    summary: 'Update the factory profile',
    auth: roles('ADMIN'),
    body: z.object({
      name: z.string().min(2).max(100),
      phone: z.string().max(20),
      address: z.string().max(200),
      maxStaffPerShift: z.number().int().min(1).max(100).nullable().optional(),
      maxDriversPerShift: z.number().int().min(1).max(100).nullable().optional(),
    }),
    response: envelope(z.object({ factory: FactoryProfile })),
    errors: [400, 401, 403, 500],
    notes: 'An empty `phone` or `address` is stored as null. A limit left out is unchanged; `null` removes it.',
  },

  // ---- Customers ----
  {
    id: 'listCustomers',
    method: 'GET',
    path: '/api/customers',
    tag: 'Customers',
    summary: 'Active customers, ordered by name',
    auth: roles('ADMIN', 'STAFF'),
    query: z.object({ countOnly: z.enum(['true', 'false']).optional() }),
    response: envelope(z.union([z.array(Customer), z.object({ count: z.number().int() })])),
    errors: [400, 401, 403, 500],
    notes: 'With `countOnly=true` the data is `{ count }` instead of the list.',
  },
  {
    id: 'createCustomer',
    method: 'POST',
    path: '/api/customers',
    tag: 'Customers',
    summary: 'Create a customer',
    auth: roles('ADMIN'),
    body: z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      address: z.string().optional(),
      phone: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
    response: envelope(Customer),
    errors: [400, 401, 403, 500],
    notes: 'The body is not schema-validated by the route: only `code` and `name` are checked for presence.',
  },
  {
    id: 'exportCustomerDebt',
    method: 'GET',
    path: '/api/customers/debt-export',
    tag: 'Customers',
    summary: 'Customers with debt ledger and shell deposit, plus their orders of the last 6 months',
    auth: session,
    response: z.object({
      customers: z.array(
        Customer.extend({ debtLedger: z.array(DebtLedgerEntry), shellDeposit: ShellDepositRow.nullable() })
      ),
      orders: z.array(OrderRow.extend({ customer: z.object({ name: z.string() }) })),
    }),
    errors: [400, 401, 500],
    notes:
      'Returned WITHOUT the `{ success, data }` envelope, and money fields are decimal strings. ' +
      'Any signed-in role can call it; the route does not check the role.',
  },

  // ---- Products, prices, inventory ----
  {
    id: 'listProducts',
    method: 'GET',
    path: '/api/products',
    tag: 'Products',
    summary: 'Active products, ordered by name then size',
    auth: session,
    response: envelope(z.array(Product)),
    errors: [400, 401, 500],
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

  // ---- Shell deposits ----
  {
    id: 'listShellDeposits',
    method: 'GET',
    path: '/api/deposits/shells',
    tag: 'Shell deposits',
    summary: 'Shell deposit balance of customers with deposit activity, highest owed first',
    auth: roles('ADMIN'),
    response: envelope(
      z.array(
        z.object({
          customerId: Id,
          customerName: z.string(),
          shellsOut: z.number().int(),
          shellsIn: z.number().int(),
          depositPerShell: z.number(),
          netDepositOwed: z.number(),
        })
      )
    ),
    errors: [400, 401, 403, 500],
  },
  {
    id: 'updateShellDeposit',
    method: 'PATCH',
    path: '/api/deposits/shells',
    tag: 'Shell deposits',
    summary: "Add shells handed out or returned to a customer's balance",
    auth: roles('ADMIN'),
    body: z.object({
      customerId: Id,
      shellsOut: z.number().int().min(0).optional(),
      shellsIn: z.number().int().min(0).optional(),
      notes: z.string().optional(),
    }),
    response: envelope(
      Success.extend({ customerId: Id, shellsOut: z.number().int(), shellsIn: z.number().int() })
    ),
    errors: [400, 401, 403, 404, 500],
    notes: 'The numbers are increments, and the response echoes the increments sent, not the new balance.',
  },
];
