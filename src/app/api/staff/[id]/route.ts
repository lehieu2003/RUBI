import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';

// PATCH /api/staff/[id] — Update user (ADMIN only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(['ADMIN']);
    await requireActiveSubscription();
    if (!session.factoryId) {
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();

    // Prevent admin from modifying themselves
    if (id === session.userId) {
      return NextResponse.json({ error: 'Không thể tự sửa tài khoản' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { id, factoryId: session.factoryId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // Toggle active status
    if (typeof body.isActive === 'boolean') {
      updateData.isActive = body.isActive;
    }

    // Reset password
    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(body.password, 12);
    }

    // Update role
    if (body.role && ['ADMIN', 'ACCOUNTANT', 'STAFF'].includes(body.role)) {
      updateData.role = body.role;
    }

    // Update name
    if (body.name) {
      updateData.name = body.name;
    }

    const user = await prisma.user.update({
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

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[PATCH /api/staff/[id]]', error);
    return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 });
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
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
    }

    const { id } = await params;

    if (id === session.userId) {
      return NextResponse.json({ error: 'Không thể tự xóa tài khoản' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { id, factoryId: session.factoryId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[DELETE /api/staff/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete staff' }, { status: 500 });
  }
}
