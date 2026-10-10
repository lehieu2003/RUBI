import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaAuth } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

const STAFF_ROLES = ['ADMIN', 'ACCOUNTANT', 'STAFF', 'DRIVER'] as const;

function createDriverSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
  return `${base || 'driver'}-${Date.now().toString(36)}`;
}

// GET /api/staff — List all users (ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
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
    return apiError('Failed to fetch staff', 500);
  }
}

// POST /api/staff — Create new staff user (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return apiError('Thiếu thông tin bắt buộc', 400);
    }

    if (password.length < 8) {
      return apiError('Mật khẩu phải có ít nhất 8 ký tự', 400);
    }

    if (!STAFF_ROLES.includes(role)) {
      return apiError('Invalid role', 400);
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
            slug: createDriverSlug(name),
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
    return apiError('Failed to create staff', 500);
  }
}
