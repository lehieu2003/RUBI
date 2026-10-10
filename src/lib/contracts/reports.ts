import { z } from 'zod';
import {
  type ApiContract,
  DateOnly,
  Id,
  IsoDateTime,
  MonthOnly,
  RoleEnum,
  Shift,
  envelope,
  roles,
} from './common';

export const reportContracts: ApiContract[] = [
  {
    id: 'getDebtReport',
    method: 'GET',
    path: '/api/reports/debt',
    tag: 'Reports',
    summary: 'Customers who owe money, highest debt first',
    auth: roles('ADMIN'),
    response: envelope(
      z.array(
        z.object({
          customerId: Id,
          customerName: z.string(),
          outstandingDebt: z.number(),
          lastPaymentDate: IsoDateTime.nullable(),
        })
      )
    ),
    errors: [400, 401, 403, 500],
    notes: 'Only customers with a positive balance are listed.',
  },
  {
    id: 'getShiftReport',
    method: 'GET',
    path: '/api/reports/shifts',
    tag: 'Reports',
    summary: 'Approved shifts, hours and days per person for one month',
    auth: roles('ADMIN'),
    query: z.object({ month: MonthOnly }),
    response: envelope(
      z.object({
        month: MonthOnly,
        shiftHours: z.literal(3),
        lockedAt: IsoDateTime.nullable(),
        people: z.array(
          z.object({
            id: Id,
            name: z.string(),
            role: RoleEnum,
            isActive: z.boolean(),
            approvedShifts: z.number().int(),
            hours: z.number().int(),
            daysWorked: z.number().int(),
            pendingShifts: z.number().int(),
            rejectedShifts: z.number().int(),
            days: z.array(z.object({ date: DateOnly, shifts: z.array(Shift) })),
          })
        ),
      })
    ),
    errors: [400, 401, 403, 500],
    notes:
      'Only people with at least one shift in the month appear. `hours` = approved shifts × 3; ' +
      '`days` lists approved shifts only. `lockedAt` is set when the month is closed.',
  },
  {
    id: 'setPayrollLock',
    method: 'POST',
    path: '/api/reports/shifts/lock',
    tag: 'Reports',
    summary: 'Close or reopen a payroll month',
    auth: roles('ADMIN'),
    body: z.object({ month: MonthOnly, locked: z.boolean() }),
    response: envelope(z.object({ month: MonthOnly, lockedAt: IsoDateTime.nullable() })),
    errors: [400, 401, 403, 409, 500],
    notes: '409 `PENDING_SHIFTS` when closing a month that still has pending requests.',
  },
];
