import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /api/customers/debt-export
// Returns customer debt data and recent orders for Excel export
export async function GET() {
  try {
    // Debt figures are for the manager only.
    const session = await requireRole(['ADMIN']);

    const factoryId = session.factoryId;
    if (!factoryId) {
      return apiError('Không tìm thấy nhà máy', 400);
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

    return apiSuccess({
      customers: customers.map((customer) => ({
        ...customer,
        debtLedger: customer.debtLedger.map((entry) => ({ ...entry, amount: entry.amount.toNumber() })),
        shellDeposit: customer.shellDeposit && {
          ...customer.shellDeposit,
          depositPerShell: customer.shellDeposit.depositPerShell.toNumber(),
        },
      })),
      orders: orders.map((order) => ({ ...order, total: order.total.toNumber() })),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/customers/debt-export]', error);
    return apiError('Không thể tải dữ liệu xuất file', 500);
  }
}
