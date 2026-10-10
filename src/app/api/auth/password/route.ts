import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession, setSessionCookie, signJWT } from '@/lib/auth';
import { prismaAuth } from '@/lib/db';
import { validatePassword } from '@/lib/password';
import { rateLimit, getIpFromRequest } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';

// POST /api/auth/password — the signed-in user changes their own password.
// Body: { currentPassword, newPassword }
// Clears the must-change-password flag and returns a fresh session token.
export async function POST(req: NextRequest) {
  // Same budget as login (this endpoint also verifies a password), counted separately.
  const ip = getIpFromRequest(req);
  const limit = await rateLimit(`password:${ip}`, 5, 60 * 1000);
  if (!limit.success) {
    return apiError('Too Many Requests', 429);
  }

  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    const body = await req.json().catch(() => null);
    const currentPassword = body?.currentPassword;
    const newPassword = body?.newPassword;
    if (typeof currentPassword !== 'string' || !currentPassword) {
      return apiError('Vui lòng nhập mật khẩu hiện tại', 400);
    }

    const policyError = validatePassword(newPassword);
    if (policyError) {
      return apiError(policyError, 400);
    }

    const user = await prismaAuth.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.isActive) {
      return apiError('Unauthorized', 401);
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return apiError('Mật khẩu hiện tại không đúng', 400);
    }
    if (newPassword === currentPassword) {
      return apiError('Mật khẩu mới phải khác mật khẩu hiện tại', 400);
    }

    await prismaAuth.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 12), mustChangePassword: false },
    });

    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      factoryId: user.factoryId ?? undefined,
      mustChangePassword: false,
    });
    await setSessionCookie(token);

    return apiSuccess({ token });
  } catch (error) {
    console.error('[POST /api/auth/password]', error);
    return apiError('Lỗi server', 500);
  }
}
