import { z } from 'zod';
import {
  type ApiContract,
  DateOnly,
  Id,
  IsoDateTime,
  MonthOnly,
  RoleEnum,
  Shift,
  ShiftStatus,
  Success,
  envelope,
  roles,
} from './common';

const week = z.object({ week: DateOnly });
const PersonRole = z.enum(['STAFF', 'DRIVER']);

export const scheduleContracts: ApiContract[] = [
  // ---- Manager ----
  {
    id: 'listScheduleAssignments',
    method: 'GET',
    path: '/api/schedule/assignments',
    tag: 'Schedule',
    summary: 'Active staff and drivers with their shifts of one week',
    auth: roles('ADMIN'),
    query: week,
    response: envelope(
      z.array(
        z.object({
          id: Id,
          name: z.string(),
          role: PersonRole,
          shifts: z.array(z.object({ id: Id, shiftDate: DateOnly, shift: Shift, status: ShiftStatus })),
        })
      )
    ),
    errors: [400, 401, 403, 409, 500],
    notes: '`week` is the first day of the 7-day window (the UI sends a Monday).',
  },
  ...(['POST', 'PATCH'] as const).map(
    (method): ApiContract => ({
      id: method === 'POST' ? 'saveScheduleAssignment' : 'saveScheduleAssignmentPatch',
      method,
      path: '/api/schedule/assignments',
      tag: 'Schedule',
      summary: 'Assign a shift to a person, or remove one',
      auth: roles('ADMIN'),
      body: z.object({
        userId: Id,
        shiftDate: DateOnly,
        shift: Shift.nullable(),
        removeShift: Shift.optional(),
      }),
      response: envelope(
        Success.extend({
          assignment: z.union([
            z.object({ id: Id, userId: Id, shift: Shift, shiftDate: DateOnly, status: z.literal('APPROVED') }),
            z.object({ userId: Id, shift: z.null(), removeShift: Shift.optional(), shiftDate: DateOnly }),
          ]),
        })
      ),
      errors: [400, 401, 403, 404, 409, 500],
      notes:
        'A shift assigned by the manager is APPROVED. `shift: null` removes `removeShift`, or every shift of that day ' +
        'when `removeShift` is omitted. 409 `PAYROLL_LOCKED` when the month is closed. POST and PATCH behave the same.',
    })
  ),
  {
    id: 'reviewShifts',
    method: 'POST',
    path: '/api/schedule/review',
    tag: 'Schedule',
    summary: 'Approve or reject shift requests',
    auth: roles('ADMIN'),
    body: z.object({ ids: z.array(Id).min(1).max(500), action: z.enum(['APPROVE', 'REJECT']) }),
    response: envelope(z.object({ updated: z.number().int() })),
    errors: [400, 401, 403, 409, 500],
    notes: '409 `PAYROLL_LOCKED` when any of the shifts is in a closed month.',
  },

  // ---- Self-service ----
  {
    id: 'getMySchedule',
    method: 'GET',
    path: '/api/schedule/my',
    tag: 'Schedule',
    summary: "The team's week, with the caller's own requests",
    auth: roles('STAFF', 'DRIVER'),
    query: week,
    response: envelope(
      z.object({
        userId: Id,
        today: DateOnly,
        currentHour: z.number().int().min(0).max(23),
        limits: z.object({ STAFF: z.number().int().nullable(), DRIVER: z.number().int().nullable() }),
        lockedMonths: z.array(MonthOnly),
        people: z.array(
          z.object({
            id: Id,
            name: z.string(),
            role: PersonRole,
            shifts: z.array(z.object({ shiftDate: DateOnly, shift: Shift, status: ShiftStatus })),
          })
        ),
      })
    ),
    errors: [400, 401, 403, 500],
    notes: "`today` and `currentHour` are Vietnam time. Other people's REJECTED requests are left out.",
  },
  {
    id: 'requestMyShift',
    method: 'POST',
    path: '/api/schedule/my',
    tag: 'Schedule',
    summary: 'Request a shift for yourself',
    auth: roles('STAFF', 'DRIVER'),
    body: z.object({ shiftDate: DateOnly, shift: Shift }),
    response: envelope(z.object({ shift: z.object({ shiftDate: DateOnly, shift: Shift, status: ShiftStatus }) })),
    errors: [400, 401, 403, 409, 500],
    notes:
      'Created as PENDING. Repeating the request returns the existing shift unchanged; a REJECTED one becomes PENDING again. ' +
      '400 for a past day or a slot of today that has ended; 409 `SHIFT_FULL` at the per-shift limit; 409 `PAYROLL_LOCKED`.',
  },
  {
    id: 'withdrawMyShift',
    method: 'DELETE',
    path: '/api/schedule/my',
    tag: 'Schedule',
    summary: 'Withdraw your own pending or rejected request',
    auth: roles('STAFF', 'DRIVER'),
    body: z.object({ shiftDate: DateOnly, shift: Shift }),
    response: envelope(Success),
    errors: [400, 401, 403, 409, 500],
    notes: '409 for an APPROVED shift (only the manager can change it) and for a closed month.',
  },

  // ---- Shift report and payroll lock ----
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
