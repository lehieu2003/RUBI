import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';
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

// PATCH /api/staff/[id] — Update user (ADMIN only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(['ADMIN']);
    await requireActiveSubscription();
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const { id } = await params;
    const body = await request.json();

    // Prevent admin from modifying themselves
    if (id === session.userId) {
      return apiError('Không thể tự sửa tài khoản', 400);
    }

    const existing = await prisma.user.findFirst({
      where: { id, factoryId: session.factoryId },
      select: { id: true, name: true, role: true, isActive: true, driverProfile: { select: { id: true } } },
    });
    if (!existing) {
      return apiError('Staff not found', 404);
    }

    const updateData: Record<string, unknown> = {};

    // Toggle active status
    if (typeof body.isActive === 'boolean') {
      updateData.isActive = body.isActive;
    }

    // Reset password
    if (body.password) {
      if (body.password.length < 8) {
        return apiError('Mật khẩu phải có ít nhất 8 ký tự', 400);
      }
      updateData.password = await bcrypt.hash(body.password, 12);
    }

    // Update role
    if (body.role && STAFF_ROLES.includes(body.role)) {
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
              slug: createDriverSlug(updatedUser.name),
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
    return apiError('Failed to update staff', 500);
  }
}

// DELETE /api/staff/[id] — Soft delete (set isActive=false) (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(['ADMIN']);
    await requireActiveSubscription();
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const { id } = await params;

    if (id === session.userId) {
      return apiError('Không thể tự xóa tài khoản', 400);
    }

    const existing = await prisma.user.findFirst({
      where: { id, factoryId: session.factoryId },
      select: { id: true },
    });
    if (!existing) {
      return apiError('Staff not found', 404);
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[DELETE /api/staff/[id]]', error);
    return apiError('Failed to delete staff', 500);
  }
}
