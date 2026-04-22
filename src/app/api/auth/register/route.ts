import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signJWT, setSessionCookie } from '@/lib/auth';
import { registerSchema } from '@/lib/schemas/auth';
import { rateLimit, getIpFromRequest } from '@/lib/rate-limit';

// Use prismaAuth for global auth queries (no tenant filtering)
import { prismaAuth } from '@/lib/db';

export async function POST(req: NextRequest) {
  // RATEL-02: Registration rate limit - 3 per IP per minute
  const ip = getIpFromRequest(req);
  const limit = rateLimit(ip, 3, 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too Many Requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { errors: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name, phone, factoryName } = parseResult.data;
    // VALI-02: Email already normalized by Zod transform (trim + lowercase)

    // Check existing user (globally unique email) - no tenant context needed
    const existing = await prismaAuth.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email đã được đăng ký' }, { status: 409 });
    }

    // Check existing phone (globally, for ADMIN users - prevent duplicate factory registration)
    const existingPhone = await prismaAuth.user.findFirst({
      where: { phone, role: 'ADMIN' },
    });
    if (existingPhone) {
      return NextResponse.json({ error: 'Số điện thoại đã được sử dụng' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // FACT-02 + SUB-01: Atomic factory + user + subscription creation
    // Use basePrisma for transaction to avoid tenant context requirement
    const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const [factory, user, subscription] = await prismaAuth.$transaction(async (tx) => {
      const factory = await tx.factory.create({
        data: { name: factoryName, phone },
      });
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          role: 'ADMIN',
          isFactoryOwner: true,
          factoryId: factory.id,
        },
      });
      const subscription = await tx.subscription.create({
        data: {
          factoryId: factory.id,
          planType: 'TRIAL',
          startDate: new Date(),
          endDate: trialEndDate,
          status: 'ACTIVE',
          driverCount: 0,
        },
      });
      return [factory, user, subscription];
    });

    // Generate JWT
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: 'ADMIN',
      factoryId: factory.id,
    });
    await setSessionCookie(token);

    // REG-01: nextUrl in response body
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        factoryId: factory.id,
      },
      subscription: {
        id: subscription.id,
        planType: subscription.planType,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status,
      },
      nextUrl: '/onboarding',
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
