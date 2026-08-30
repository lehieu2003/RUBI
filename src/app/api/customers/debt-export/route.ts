import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /api/customers/debt-export
// Returns customer debt data and recent orders for Excel export
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    const factoryId = session.factoryId;
    if (!factoryId) {
      return apiError('Factory not found', 400);
    }

    const customers = await prisma.customer.findMany({
      where: { isActive: true, factoryId },
      orderBy: { name: 'asc' },
      include: {
        debtLedger: true,
        shellDeposit: true,
      },
    });

    // Fetch recent orders (last 6 months) for this factory's customers
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get customer IDs for this factory
    const customerIds = customers.map(c => c.id);

    const orders = await prisma.order.findMany({
      where: {
        factoryId,
        customerId: { in: customerIds },
        createdAt: { gte: sixMonthsAgo },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
      },
    });

    return NextResponse.json({ customers, orders });
  } catch (error) {
    console.error('[GET /api/customers/debt-export]', error);
    return apiError('Failed to fetch export data', 500);
  }
}
