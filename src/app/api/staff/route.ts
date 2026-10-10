import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaAuth } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireRole } from '@/lib/auth/helpers';
import { validatePassword } from '@/lib/password';
import { CreateStaffBody } from '@/lib/contracts/accounts';
import { apiSuccess, apiError } from "@/lib/api-response";

// The single manager (ADMIN) account is created with `npm run admin:create`,
// never from the app: the request schema only accepts STAFF and DRIVER.

// GET /api/staff — List all users (ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const users = await prisma.user.findMany({
      where: { factoryId: session.factoryId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        driverProfile: { select: { phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Drivers created before accounts carried a phone hold it on the driver
    // profile only: show that number rather than an empty cell.
    return apiSuccess({
      users: users.map(({ driverProfile, ...user }) => ({ ...user, phone: user.phone ?? driverProfile?.phone ?? null })),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/staff]', error);
    return apiError('Không thể tải danh sách nhân sự', 500);
  }
}

// POST /api/staff — Create new staff user (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const parsed = CreateStaffBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Thiếu thông tin bắt buộc', 400);
    }
    const { name, email, password, role } = parsed.data;
    const phone = parsed.data.phone || null;

    const policyError = validatePassword(password);
    if (policyError) {
      return apiError(policyError, 400);
    }

    // Check if email exists
    const existing = await prismaAuth.user.findUnique({ where: { email } });
    if (existing) {
      return apiError('Email đã được đăng ký', 409);
    }
    // A driver's phone is unique within the factory.
    if (role === 'DRIVER' && phone) {
      const taken = await prisma.driver.findFirst({
        where: { factoryId: session.factoryId, phone },
        select: { id: true },
      });
      if (taken) {
        return apiError('Số điện thoại này đã được dùng cho một tài xế khác', 409, 'PHONE_TAKEN');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          role,
          factoryId: session.factoryId,
          // The manager knows this initial password; force a change on first login.
          mustChangePassword: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (role === 'DRIVER') {
        await tx.driver.create({
          data: {
            name,
            phone,
            isActive: true,
            factoryId: session.factoryId!,
            userId: createdUser.id,
          },
        });
      }

      return createdUser;
    });

    return apiSuccess({ user });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/staff]', error);
    return apiError('Không thể tạo nhân sự', 500);
  }
}
