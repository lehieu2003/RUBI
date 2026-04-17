import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { signJWT, setSessionCookie } from '@/lib/auth';

const prisma = new PrismaClient();

// Validation schema
const registerSchema = {
  email: { minLength: 5, maxLength: 100 },
  password: { minLength: 6, maxLength: 100 },
  name: { minLength: 2, maxLength: 100 },
  phone: { minLength: 9, maxLength: 15 },
  factoryName: { minLength: 2, maxLength: 100 },
};

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, phone, factoryName } = await req.json();

    // Validate required fields
    if (!email || !password || !name || !phone || !factoryName) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (email.length < registerSchema.email.minLength || email.length > registerSchema.email.maxLength) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
    }
    if (password.length < registerSchema.password.minLength) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
    }
    if (name.length < registerSchema.name.minLength || name.length > registerSchema.name.maxLength) {
      return NextResponse.json({ error: 'Tên phải có ít nhất 2 ký tự' }, { status: 400 });
    }
    if (phone.length < registerSchema.phone.minLength || phone.length > registerSchema.phone.maxLength) {
      return NextResponse.json({ error: 'Số điện thoại không hợp lệ' }, { status: 400 });
    }
    if (factoryName.length < registerSchema.factoryName.minLength || factoryName.length > registerSchema.factoryName.maxLength) {
      return NextResponse.json({ error: 'Tên xưởng phải có ít nhất 2 ký tự' }, { status: 400 });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Email đã được đăng ký' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and subscription atomically using prisma.$transaction
    // The user creates with temporary factoryId, then we update it to self-reference,
    // all within the same transaction
    const [user, subscription] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          role: 'ADMIN',
          isFactoryOwner: true,
          factoryId: undefined, // temporary until update
        },
      }),
      prisma.subscription.create({
        data: {
          planType: 'TRIAL',
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
          driverCount: 0,
        },
      }),
    ]);

    // Update user's factoryId to own id and subscription's factoryId atomically
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { factoryId: user.id },
      }),
      prisma.subscription.update({
        where: { id: subscription.id },
        data: { factoryId: user.id },
      }),
    ]);

    // Generate JWT with factoryId
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: 'ADMIN',
      factoryId: user.id, // ADMIN user.id = factoryId
    });

    // Set cookie
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        factoryId: user.id,
      },
      subscription: {
        id: subscription.id,
        planType: subscription.planType,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    );
  }
}
