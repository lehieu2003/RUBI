import { z } from 'zod';
import { type ApiContract, Id, Success, envelope, roles } from './common';

export const shellDepositContracts: ApiContract[] = [
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
    summary: "Add shells handed out or returned to a customer's balance, or correct the totals",
    auth: roles('ADMIN'),
    body: z.object({
      customerId: Id,
      shellsOut: z.number().int().min(0).optional(),
      shellsIn: z.number().int().min(0).optional(),
      mode: z.enum(['ADD', 'SET']).optional(),
      notes: z.string().optional(),
    }),
    response: envelope(
      Success.extend({ customerId: Id, shellsOut: z.number().int(), shellsIn: z.number().int() })
    ),
    errors: [400, 401, 403, 404, 422, 500],
    idempotent: true,
    notes:
      'By default (`mode: "ADD"` or omitted) the numbers are increments. With `mode: "SET"` they replace both totals, ' +
      'to correct a mistyped entry; both `shellsOut` and `shellsIn` are then required (400 otherwise). ' +
      'The response echoes the numbers sent, not the new balance. ' +
      'Send `Idempotency-Key` (one per submission, reused on resend) so a resent request is written once; ' +
      '422 `IDEMPOTENCY_KEY_REUSED` when the key was used for a different request.',
  },
];
