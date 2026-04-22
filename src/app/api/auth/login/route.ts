import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signJWT, setSessionCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/schemas/auth';
import { rateLimit, getIpFromRequest } from '@/lib/rate-limit';

// Use basePrisma for global auth queries (no tenant filtering)
import { prisma as basePrisma } from '@/lib/db';
const prismaAuth = basePrisma;

export async function POST(req: NextRequest) {
  // RATEL-01: Login rate limit - 5 per IP per minute
  const ip = getIpFromRequest(req);
  const limit = rateLimit(ip, 5, 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too Many Requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { errors: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    const user = await prismaAuth.user.findUnique({ where: { email } });
    if (!user) {
      // Perform dummy bcrypt comparison to prevent timing leak attack
      await bcrypt.compare(password, '$2b$12$placeholder.hash.that.is.valid.for.timing');
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Tài khoản đã bị vô hiệu hóa' }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
    }

    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      factoryId: (user as { factoryId?: string }).factoryId ?? undefined,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
