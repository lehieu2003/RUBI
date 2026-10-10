import { z } from 'zod';
import { type ApiContract, Id, IsoDateTime, RoleEnum, Success, envelope, roles } from './common';

const StaffUser = z.object({
  id: Id,
  name: z.string(),
  email: z.string(),
  role: RoleEnum,
  isActive: z.boolean(),
  createdAt: IsoDateTime,
});

const userId = z.object({ id: Id });
const AccountRole = z.enum(['STAFF', 'DRIVER'], 'Vai trò không hợp lệ');

/** Body of POST /api/staff; the route validates with this schema. */
export const CreateStaffBody = z.object({
  name: z.string('Thiếu thông tin bắt buộc').trim().min(1, 'Thiếu thông tin bắt buộc').max(100),
  email: z.string('Thiếu thông tin bắt buộc').trim().min(1, 'Thiếu thông tin bắt buộc').email('Email không hợp lệ'),
  // Strength is checked by the shared password policy (src/lib/password.ts).
  password: z.string('Thiếu thông tin bắt buộc').min(1, 'Thiếu thông tin bắt buộc'),
  role: AccountRole,
});

/** Body of PATCH /api/staff/{id}; the route validates with this schema. */
export const UpdateStaffBody = z.object({
  isActive: z.boolean().optional(),
  password: z.string().min(1).optional(),
  role: AccountRole.optional(),
  name: z.string().trim().min(1, 'Tên không được để trống').max(100).optional(),
});

export const accountContracts: ApiContract[] = [
  {
    id: 'listStaff',
    method: 'GET',
    path: '/api/staff',
    tag: 'Accounts',
    summary: 'Every account of the factory, newest first',
    auth: roles('ADMIN'),
    response: envelope(z.object({ users: z.array(StaffUser) })),
    errors: [400, 401, 403, 500],
  },
  {
    id: 'createStaff',
    method: 'POST',
    path: '/api/staff',
    tag: 'Accounts',
    summary: 'Create a staff or driver account',
    auth: roles('ADMIN'),
    body: CreateStaffBody,
    response: envelope(z.object({ user: StaffUser })),
    errors: [400, 401, 403, 409, 500],
    notes:
      'Password: at least 8 characters, letters and digits, not a well-known password. ' +
      'The new account must change its password at first login. A DRIVER also gets a driver profile and share link. ' +
      'Manager accounts cannot be created here. 409 when the email is taken.',
  },
  {
    id: 'updateStaff',
    method: 'PATCH',
    path: '/api/staff/{id}',
    tag: 'Accounts',
    summary: 'Lock/unlock, rename, change role or reset the password of an account',
    auth: roles('ADMIN'),
    params: userId,
    body: UpdateStaffBody,
    response: envelope(z.object({ user: StaffUser })),
    errors: [400, 401, 403, 404, 500],
    notes:
      'Only the fields sent are changed. A password reset forces a change at next login. ' +
      'You cannot edit yourself (400) or a manager account (403).',
  },
  {
    id: 'deactivateStaff',
    method: 'DELETE',
    path: '/api/staff/{id}',
    tag: 'Accounts',
    summary: 'Deactivate an account (soft delete)',
    auth: roles('ADMIN'),
    params: userId,
    response: envelope(Success),
    errors: [400, 401, 403, 404, 500],
  },
  {
    id: 'rotateDriverLink',
    method: 'POST',
    path: '/api/staff/{id}/rotate-link',
    tag: 'Accounts',
    summary: "Replace a driver's share link; the old link stops working",
    auth: roles('ADMIN'),
    params: userId,
    response: envelope(z.object({ link: z.string(), driverName: z.string() })),
    errors: [400, 401, 403, 404, 500],
    notes: '`link` is a relative path such as `/d/<token>`.',
  },
  {
    id: 'listDrivers',
    method: 'GET',
    path: '/api/drivers',
    tag: 'Accounts',
    summary: 'Active drivers with an active DRIVER account',
    auth: roles('ADMIN', 'STAFF'),
    response: envelope(
      z.array(
        z.object({
          id: Id,
          name: z.string(),
          phone: z.string().nullable(),
          slug: z.string(),
          token: z.string(),
          isActive: z.boolean(),
        })
      )
    ),
    errors: [400, 401, 403, 500],
    notes: 'Includes each driver\'s share-link `token`.',
  },
  {
    id: 'createDriver',
    method: 'POST',
    path: '/api/drivers',
    tag: 'Accounts',
    summary: 'Not supported: drivers are created as DRIVER accounts through POST /api/staff',
    auth: roles('ADMIN'),
    response: z.never(),
    errors: [401, 403, 405],
    notes: 'Always answers 405 for a manager.',
  },
];
