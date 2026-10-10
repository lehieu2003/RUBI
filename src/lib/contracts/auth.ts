import { z } from 'zod';
import { type ApiContract, Id, RoleEnum, Success, envelope, publicAccess, session } from './common';

const SessionUser = z.object({
  id: Id,
  email: z.string(),
  name: z.string(),
  role: RoleEnum,
  factoryId: Id.nullable(),
  mustChangePassword: z.boolean(),
});

export const authContracts: ApiContract[] = [
  {
    id: 'login',
    method: 'POST',
    path: '/api/auth/login',
    tag: 'Auth',
    summary: 'Sign in with email and password',
    auth: publicAccess,
    body: z.object({ email: z.string().email(), password: z.string().min(1) }),
    response: envelope(z.object({ user: SessionUser, token: z.string() })),
    errors: [400, 401, 403, 429, 500],
    notes:
      'Sets the httpOnly `auth_token` cookie (7 days) and also returns the JWT in `token` for non-browser clients. ' +
      'Rate limited to 5 attempts per account per minute, plus 30 per client address per minute.',
  },
  {
    id: 'logout',
    method: 'POST',
    path: '/api/auth/logout',
    tag: 'Auth',
    summary: 'Clear the session cookie',
    auth: publicAccess,
    response: envelope(Success),
    errors: [],
  },
  {
    id: 'me',
    method: 'GET',
    path: '/api/auth/me',
    tag: 'Auth',
    summary: 'Current user, or `user: null` when not signed in',
    auth: publicAccess,
    response: envelope(z.object({ user: SessionUser.extend({ factoryId: Id }).nullable() })),
    errors: [403],
    notes: 'Never answers 401: an anonymous caller gets `{ user: null }`.',
  },
  {
    id: 'refreshSession',
    method: 'POST',
    path: '/api/auth/refresh',
    tag: 'Auth',
    summary: 'Exchange a still-valid session for a fresh 7-day JWT',
    auth: session,
    response: envelope(z.object({ token: z.string() })),
    errors: [401, 429, 500],
    notes: 'Used by the mobile app. Rate limited to 30 per client address per minute.',
  },
  {
    id: 'changePassword',
    method: 'POST',
    path: '/api/auth/password',
    tag: 'Auth',
    summary: 'Change your own password',
    auth: session,
    body: z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(72) }),
    response: envelope(z.object({ token: z.string() })),
    errors: [400, 401, 429, 500],
    notes:
      'New password: at least 8 characters, letters and digits, not a well-known password, different from the current one. ' +
      'Clears `mustChangePassword` and reissues the session cookie. Works even while a password change is required.',
  },
];
