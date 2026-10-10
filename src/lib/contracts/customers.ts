import { z } from 'zod';
import {
  type ApiContract,
  Customer,
  Id,
  IsoDateTime,
  OrderRow,
  envelope,
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
];
