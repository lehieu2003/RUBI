import { NextRequest } from 'next/server';
import { getSession, signJWT } from '@/lib/auth';
import { rateLimit, getIpFromRequest } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';

// Sliding session for mobile clients (Phase 1): exchanging a still-valid
// Bearer token (getSession is Bearer-aware) for a fresh 7-day JWT keeps
// active users logged in without a refresh-token table.
export async function POST(req: NextRequest) {
  // 30 refreshes per IP per minute — well above the proactive app-open
  // cadence while blocking token-minting abuse.
  const ip = getIpFromRequest(req);
  const limit = await rateLimit(`refresh:${ip}`, 30, 60 * 1000);
  if (!limit.success) {
    return apiError('Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút', 429);
  }

  try {
    const session = await getSession();
    if (!session) {
      // getSession already re-checked user.isActive in the DB, so a
      // deactivated user fails here even with a still-unexpired token.
      return apiError('Chưa đăng nhập hoặc phiên đã hết hạn', 401);
    }

    const token = await signJWT({
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      factoryId: session.factoryId,
      mustChangePassword: session.mustChangePassword,
    });

    return apiSuccess({ token });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/auth/refresh]', error);
    return apiError('Lỗi server', 500);
  }
}
