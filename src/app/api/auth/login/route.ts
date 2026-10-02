import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signJWT, setSessionCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/schemas/auth';
import { rateLimit, getIpFromRequest } from '@/lib/rate-limit';

// Use prismaAuth for global auth queries (no tenant filtering)
import { prismaAuth } from '@/lib/db';
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  // RATEL-01: Login rate limit - 5 per IP per minute
  const ip = getIpFromRequest(req);
  const limit = await rateLimit(ip, 5, 60 * 1000);
  if (!limit.success) {
    return apiError('Too Many Requests', 429);
  }

  try {
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0] || 'Dữ liệu không hợp lệ';
      return apiError(firstError, 400);
    }

    const { email, password } = parseResult.data;

    const user = await prismaAuth.user.findUnique({ where: { email } });
    if (!user) {
      // Perform dummy bcrypt comparison to prevent timing leak attack
      await bcrypt.compare(password, '$2b$12$placeholder.hash.that.is.valid.for.timing');
      return apiError('Email hoặc mật khẩu không đúng', 401);
    }

    if (!user.isActive) {
      return apiError('Tài khoản đã bị vô hiệu hóa', 403);
    }

    if (user.role !== 'SUPER_ADMIN' && !user.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy. Vui lòng liên hệ admin.', 403);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return apiError('Email hoặc mật khẩu không đúng', 401);
    }

    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      factoryId: (user as { factoryId?: string }).factoryId ?? undefined,
    });
    await setSessionCookie(token);

    return apiSuccess({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            factoryId: user.factoryId,
          },
        });
  } catch (error) {
    console.error('Login error:', error);
    return apiError('Lỗi server', 500);
  }
}
