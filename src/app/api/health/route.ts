import { prismaAuth } from '@/lib/db';

// GET /api/health — liveness probe for uptime monitors.
// Public by design; returns no internal details, just DB reachability.
export async function GET() {
  try {
    await prismaAuth.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: 'up' });
  } catch {
    return Response.json({ ok: false, db: 'down' }, { status: 503 });
  }
}
