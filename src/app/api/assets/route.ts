import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /api/assets?type=MACHINE|VEHICLE — list assets with nearest due date
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const where: Record<string, unknown> = { factoryId: session.factoryId };
    if (type === 'MACHINE' || type === 'VEHICLE') {
      where.type = type;
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        maintenanceRecords: {
          orderBy: { dueAt: 'asc' },
          where: { dueAt: { not: null } },
          take: 1,
          select: { dueAt: true, type: true },
        },
        _count: { select: { maintenanceRecords: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const serialized = assets.map(({ maintenanceRecords, _count, ...asset }) => ({
      ...asset,
      maintenanceCount: _count.maintenanceRecords,
      nextDue: maintenanceRecords[0]?.dueAt?.toISOString() ?? null,
      nextDueType: maintenanceRecords[0]?.type ?? null,
    }));

    return apiSuccess(serialized);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/assets]', error);
    return apiError('Không thể tải danh sách tài sản', 500);
  }
}

const CreateAssetSchema = z.object({
  type: z.enum(['MACHINE', 'VEHICLE']),
  name: z.string().min(1, 'Tên tài sản là bắt buộc'),
  code: z.string().min(1, 'Mã tài sản là bắt buộc'),
  licensePlate: z.string().optional(),
  capacityTons: z.number().positive().optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'BROKEN', 'INACTIVE']).optional(),
  notes: z.string().optional(),
});

// POST /api/assets — create an asset
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const body = await request.json();
    const parsed = CreateAssetSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues.map((e) => e.message).join(', '), 400);
    }

    const data = parsed.data;

    const duplicate = await prisma.asset.findFirst({
      where: { code: data.code, factoryId: session.factoryId },
      select: { id: true },
    });
    if (duplicate) {
      return apiError(`Mã tài sản "${data.code}" đã tồn tại trong xưởng`, 409);
    }

    if (data.type === 'MACHINE' && data.licensePlate) {
      return apiError('Máy móc không có biển số', 400);
    }
    if (data.type === 'VEHICLE' && !data.licensePlate) {
      return apiError('Xe tải phải có biển số', 400);
    }

    const asset = await prisma.asset.create({
      data: {
        factoryId: session.factoryId,
        type: data.type,
        name: data.name,
        code: data.code,
        licensePlate: data.licensePlate ?? null,
        capacityTons: data.capacityTons ?? null,
        status: data.status ?? 'ACTIVE',
        notes: data.notes ?? null,
      },
    });

    return apiSuccess(asset, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/assets]', error);
    return apiError('Không thể tạo tài sản', 500);
  }
}
