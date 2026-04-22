import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const ShellDepositSchema = z.object({
  customerId: z.string(),
  shellsOut: z.number().int().min(0).optional(),
  shellsIn: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.factoryId) {
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
    }
    if (session.role !== 'ACCOUNTANT' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    return NextResponse.json(deposits);
  } catch (error) {
    console.error('[GET /api/deposits/shells]', error);
    return NextResponse.json({ error: 'Failed to fetch deposit data' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.factoryId) {
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
    }
    if (session.role !== 'ACCOUNTANT' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = ShellDepositSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const { customerId, shellsOut, shellsIn } = parsed.data;

    // Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, factoryId: session.factoryId },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    await prisma.customerShellDeposit.upsert({
      where: { customerId },
      create: {
        customerId,
        shellsOut: shellsOut ?? 0,
        shellsIn: shellsIn ?? 0,
        depositPerShell: 50000, // Default 50,000 VND per D-09
      },
      update: {
        shellsOut: { increment: shellsOut ?? 0 },
        shellsIn: { increment: shellsIn ?? 0 },
      },
    });

    return NextResponse.json({
      success: true,
      customerId,
      shellsOut: shellsOut ?? 0,
      shellsIn: shellsIn ?? 0,
    });
  } catch (error) {
    console.error('[PATCH /api/deposits/shells]', error);
    return NextResponse.json({ error: 'Failed to update deposit' }, { status: 500 });
  }
}
