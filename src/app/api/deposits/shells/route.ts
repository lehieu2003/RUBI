import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { z } from 'zod';
import { apiSuccess, apiError } from "@/lib/api-response";
import { Idempotency } from '@/lib/idempotency';

const ShellDepositSchema = z.object({
  customerId: z.string(),
  shellsOut: z.number().int().min(0).optional(),
  shellsIn: z.number().int().min(0).optional(),
  // ADD (default) records shells handed out or returned; SET corrects a
  // mistyped total by replacing both counts.
  mode: z.enum(['ADD', 'SET']).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const customers = await prisma.customer.findMany({
      where: { factoryId: session.factoryId },
      include: {
        shellDeposit: true,
      },
    });

    const deposits = customers
      .map((customer) => {
        const deposit = customer.shellDeposit;
        const netDepositOwed = deposit
          ? (deposit.shellsOut - deposit.shellsIn) * deposit.depositPerShell.toNumber()
          : 0;

        return {
          customerId: customer.id,
          customerName: customer.name,
          shellsOut: deposit?.shellsOut ?? 0,
          shellsIn: deposit?.shellsIn ?? 0,
          depositPerShell: deposit?.depositPerShell?.toNumber() ?? 50000,
          netDepositOwed,
        };
      })
      .filter(d => d.shellsOut > 0 || d.shellsIn > 0); // Only show customers with deposit activity

    // Sort by netDepositOwed descending (most owed first)
    deposits.sort((a, b) => b.netDepositOwed - a.netDepositOwed);

    return apiSuccess(deposits);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/deposits/shells]', error);
    return apiError('Không thể tải dữ liệu vỏ bao', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const body = await request.json();
    const parsed = ShellDepositSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Dữ liệu không hợp lệ', 400);
    }

    const { customerId, shellsOut, shellsIn, mode } = parsed.data;
    if (mode === 'SET' && (shellsOut === undefined || shellsIn === undefined)) {
      return apiError('Sửa số vỏ cần cả số vỏ trả ra và số vỏ thu về', 400);
    }

    // Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, factoryId: session.factoryId },
    });
    if (!customer) {
      return apiError('Không tìm thấy khách hàng', 404);
    }

    const idempotency = Idempotency.from(request, session.factoryId, 'PATCH /api/deposits/shells', parsed.data);
    if (idempotency instanceof Response) return idempotency;

    // ADD adds to the running counts, so a resend of the same submission
    // (same Idempotency-Key) gets the first answer back instead.
    return await idempotency.run(() =>
      prisma.$transaction(async (tx) => {
        await idempotency.begin(tx);
        await tx.customerShellDeposit.upsert({
          where: { customerId },
          create: {
            customerId,
            shellsOut: shellsOut ?? 0,
            shellsIn: shellsIn ?? 0,
            depositPerShell: 50000, // Default 50,000 VND per D-09
          },
          update:
            mode === 'SET'
              ? { shellsOut, shellsIn }
              : {
                  shellsOut: { increment: shellsOut ?? 0 },
                  shellsIn: { increment: shellsIn ?? 0 },
                },
        });

        return idempotency.finish(
          tx,
          apiSuccess({
            success: true,
            customerId,
            shellsOut: shellsOut ?? 0,
            shellsIn: shellsIn ?? 0,
          })
        );
      })
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[PATCH /api/deposits/shells]', error);
    return apiError('Không thể cập nhật vỏ bao', 500);
  }
}
