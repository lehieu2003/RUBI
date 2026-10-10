import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from '@/lib/api-response';

const profileSelect = {
  name: true,
  phone: true,
  address: true,
  maxStaffPerShift: true,
  maxDriversPerShift: true,
} as const;

// null (or an empty field) means no limit
const limit = z.number().int().min(1, 'Giới hạn mỗi ca phải từ 1 người trở lên').max(100).nullable().optional();

const ProfileSchema = z.object({
  name: z.string().trim().min(2, 'Tên nhà máy phải có ít nhất 2 ký tự').max(100),
  phone: z.string().trim().max(20, 'Số điện thoại quá dài'),
  address: z.string().trim().max(200, 'Địa chỉ quá dài'),
  maxStaffPerShift: limit,
  maxDriversPerShift: limit,
});

// GET /api/factory — factory profile shown in Settings (ADMIN only)
export async function GET() {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }
    const factory = await prisma.factory.findUnique({
      where: { id: session.factoryId },
      select: profileSelect,
    });
    if (!factory) {
      return apiError('Không tìm thấy nhà máy', 404);
    }
    return apiSuccess({ factory });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/factory]', error);
    return apiError('Lỗi server', 500);
  }
}

// PATCH /api/factory — update the factory profile (ADMIN only)
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const parsed = ProfileSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ', 400);
    }
    const { name, phone, address, maxStaffPerShift, maxDriversPerShift } = parsed.data;

    const factory = await prisma.factory.update({
      where: { id: session.factoryId },
      // undefined leaves a limit untouched; null clears it
      data: { name, phone: phone || null, address: address || null, maxStaffPerShift, maxDriversPerShift },
      select: profileSelect,
    });
    return apiSuccess({ factory });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[PATCH /api/factory]', error);
    return apiError('Lỗi server', 500);
  }
}
