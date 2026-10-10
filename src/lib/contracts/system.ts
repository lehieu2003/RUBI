import { z } from 'zod';
import { type ApiContract, publicAccess } from './common';

export const systemContracts: ApiContract[] = [
  {
    id: 'health',
    method: 'GET',
    path: '/api/health',
    tag: 'System',
    summary: 'Liveness and database check',
    auth: publicAccess,
    response: z.object({ ok: z.literal(true), db: z.literal('up') }),
    errors: [503],
    notes: 'Returned WITHOUT the envelope. 503 with `{ ok: false, db: "down" }` when the database is unreachable.',
  },
];
