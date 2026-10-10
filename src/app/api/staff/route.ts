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
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess({ users });
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

    const policyError = validatePassword(password);
    if (policyError) {
      return apiError(policyError, 400);
    }

    // Check if email exists
    const existing = await prismaAuth.user.findUnique({ where: { email } });
    if (existing) {
      return apiError('Email đã được đăng ký', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          factoryId: session.factoryId,
          // The manager knows this initial password; force a change on first login.
          mustChangePassword: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (role === 'DRIVER') {
        await tx.driver.create({
          data: {
            name,
            phone: null,
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
