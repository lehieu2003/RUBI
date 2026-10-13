import { z } from 'zod';
import {
  type ApiContract,
  Customer,
  Id,
  IsoDateTime,
  OrderRow,
  envelope,
  paginated,
  paginationQuery,
  roles,
} from './common';

const DebtLedgerEntry = z.object({
  id: Id,
  customerId: Id,
  type: z.enum(['DEBT', 'PAYMENT']),
  amount: z.number(),
  notes: z.string().nullable(),
  createdAt: IsoDateTime,
});

const ShellDepositRow = z.object({
  id: Id,
  customerId: Id,
  shellsOut: z.number().int(),
  shellsIn: z.number().int(),
  depositPerShell: z.number(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

/** Body of POST /api/customers; the route validates with this schema. */
export const CreateCustomerBody = z.object({
  code: z.string().trim().min(1, 'Vui lòng nhập mã và tên').max(50),
  name: z.string().trim().min(1, 'Vui lòng nhập mã và tên').max(200),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(30).optional(),
  isActive: z.boolean().optional(),
});

/** Body of POST /api/customers/{id}/payments; the route validates with this schema. */
export const RecordPaymentBody = z.object({
  amount: z
    .number('Vui lòng nhập số tiền')
    .int('Số tiền phải là số nguyên (VND)')
    .positive('Số tiền phải lớn hơn 0')
    .max(10_000_000_000, 'Số tiền quá lớn'),
  notes: z.string().trim().max(300, 'Ghi chú quá dài').optional(),
});

const customerId = z.object({ id: Id });

export const customerContracts: ApiContract[] = [
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
    body: CreateCustomerBody,
    response: envelope(Customer),
    errors: [400, 401, 403, 409, 500],
    notes: '409 when the customer code already exists.',
  },
  {
    id: 'listCustomerPrices',
    method: 'GET',
    path: '/api/customers/{id}/prices',
    tag: 'Customers',
    summary: 'Products on sale with this customer\'s price and what is left to sell',
    auth: roles('ADMIN', 'STAFF'),
    params: z.object({ id: Id }),
    response: envelope(
      z.array(
        z.object({
          productId: Id,
          name: z.string(),
          sizeKg: z.number().int(),
          unit: z.string(),
          price: z.number().nullable(),
          sellable: z.number().int().nullable(),
        })
      )
    ),
    errors: [400, 401, 403, 404, 500],
    notes:
      'Feeds the order form once a customer is picked. `price` is the customer\'s own price, else the default one; ' +
      'null when the product has no price yet and cannot be ordered. `sellable` is the stock on the books minus what ' +
      'unsettled orders already took (it can be negative); null when the product never had a stock record. Ordered ' +
      'by name then size.',
  },
  {
    id: 'exportCustomerDebt',
    method: 'GET',
    path: '/api/customers/debt-export',
    tag: 'Customers',
    summary: 'Customers with debt ledger and shell deposit, plus their orders of the last 6 months',
    auth: roles('ADMIN'),
    response: envelope(
      z.object({
        customers: z.array(
          Customer.extend({ debtLedger: z.array(DebtLedgerEntry), shellDeposit: ShellDepositRow.nullable() })
        ),
        orders: z.array(OrderRow.extend({ customer: z.object({ name: z.string() }) })),
      })
    ),
    errors: [400, 401, 403, 500],
  },
  {
    id: 'recordCustomerPayment',
    method: 'POST',
    path: '/api/customers/{id}/payments',
    tag: 'Customers',
    summary: 'Record money received from a customer',
    auth: roles('ADMIN'),
    params: customerId,
    body: RecordPaymentBody,
    successStatus: 201,
    response: envelope(z.object({ payment: DebtLedgerEntry, outstandingDebt: z.number() })),
    errors: [400, 401, 403, 404, 409, 500],
    notes:
      'Stored as a PAYMENT entry in the debt ledger. `amount` is whole VND. ' +
      '409 `PAYMENT_EXCEEDS_DEBT` when it is more than the customer currently owes. ' +
      '`outstandingDebt` is what remains after this payment.',
  },
  {
    id: 'listCustomerLedger',
    method: 'GET',
    path: '/api/customers/{id}/ledger',
    tag: 'Customers',
    summary: "A customer's debt and payment entries, newest first, paginated",
    auth: roles('ADMIN'),
    params: customerId,
    query: z.object(paginationQuery),
    response: paginated(DebtLedgerEntry),
    errors: [400, 401, 403, 404, 500],
    notes: 'DEBT entries are created when an order is reconciled; PAYMENT entries when a payment is recorded.',
  },
];
