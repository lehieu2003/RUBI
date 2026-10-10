import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireRole } from '@/lib/auth/helpers';
import { validatePassword } from '@/lib/password';
import { UpdateStaffBody } from '@/lib/contracts/accounts';
import { apiSuccess, apiError } from "@/lib/api-response";

// The single manager (ADMIN) account is created with `npm run admin:create`,
// never from the app: the request schema only accepts STAFF and DRIVER.

// PATCH /api/staff/[id] — Update user (ADMIN only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const { id } = await params;
    const parsed = UpdateStaffBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ', 400);
    }
    const body = parsed.data;

    // Prevent admin from modifying themselves
    if (id === session.userId) {
      return apiError('Không thể tự sửa tài khoản', 400);
    }

    const existing = await prisma.user.findFirst({
      where: { id, factoryId: session.factoryId },
      select: { id: true, name: true, role: true, isActive: true, driverProfile: { select: { id: true } } },
    });
    if (!existing) {
      return apiError('Không tìm thấy nhân sự', 404);
    }
    if (existing.role === 'ADMIN') {
      return apiError('Không thể sửa tài khoản Quản lý', 403);
    }

    const updateData: Record<string, unknown> = {};

    // Toggle active status
    if (typeof body.isActive === 'boolean') {
      updateData.isActive = body.isActive;
    }

    // Reset password
    if (body.password) {
      const policyError = validatePassword(body.password);
      if (policyError) {
        return apiError(policyError, 400);
      }
      updateData.password = await bcrypt.hash(body.password, 12);
      updateData.mustChangePassword = true;
    }

    // Update role
    if (body.role) {
      updateData.role = body.role;
    }

    // Update name
    if (body.name) {
      updateData.name = body.name;
    }

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (updatedUser.role === 'DRIVER') {
        const driver = await tx.driver.findUnique({
          where: { userId: updatedUser.id },
          select: { id: true },
        });

        if (driver) {
          await tx.driver.update({
            where: { id: driver.id },
            data: { name: updatedUser.name, isActive: updatedUser.isActive },
          });
        } else {
          await tx.driver.create({
            data: {
              name: updatedUser.name,
              phone: null,
              isActive: updatedUser.isActive,
              factoryId: session.factoryId!,
              userId: updatedUser.id,
            },
          });
        }
      } else if (existing.driverProfile) {
        await tx.driver.update({
          where: { id: existing.driverProfile.id },
          data: { isActive: false },
        });
      }

      return updatedUser;
    });

    return apiSuccess({ user });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[PATCH /api/staff/[id]]', error);
    return apiError('Không thể cập nhật nhân sự', 500);
  }
}

// DELETE /api/staff/[id] — Soft delete (set isActive=false) (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const { id } = await params;

    if (id === session.userId) {
      return apiError('Không thể tự xóa tài khoản', 400);
    }

    const existing = await prisma.user.findFirst({
      where: { id, factoryId: session.factoryId },
      select: { id: true, role: true },
    });
    if (!existing) {
      return apiError('Không tìm thấy nhân sự', 404);
    }
    if (existing.role === 'ADMIN') {
      return apiError('Không thể xóa tài khoản Quản lý', 403);
    }

    // A deactivated driver account must not stay assignable to orders.
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { isActive: false },
      }),
      prisma.driver.updateMany({
        where: { userId: id, factoryId: session.factoryId },
        data: { isActive: false },
      }),
    ]);

    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[DELETE /api/staff/[id]]', error);
    return apiError('Không thể xoá nhân sự', 500);
  }
}
