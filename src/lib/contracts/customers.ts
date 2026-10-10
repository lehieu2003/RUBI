import { z } from 'zod';
import {
  type ApiContract,
  Customer,
  DecimalString,
  Id,
  IsoDateTime,
  OrderRow,
  envelope,
  roles,
  session,
} from './common';

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
];
