import { NextRequest } from 'next/server';
import { prismaAuth } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { sendPaymentSuccessEmail } from '@/lib/email/service';

/**
 * Universal Payment Webhook Handler (SePay, Casso, PayOS, Direct Bank Webhook)
 * Endpoint: POST /api/webhooks/payment
 */
export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

    // Fail closed in production: an unauthenticated payment webhook would
    // let anyone activate paid subscriptions (revenue loss).
    if (process.env.NODE_ENV === 'production' && !webhookSecret) {
      console.error('[POST /api/webhooks/payment] PAYMENT_WEBHOOK_SECRET is required in production');
      return apiError('Webhook not configured', 503);
    }

    const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key');

    // Verify webhook secret if configured in environment
    if (webhookSecret) {
      const providedToken = authHeader?.replace(/^Bearer\s+/i, '');
      if (providedToken !== webhookSecret) {
        return apiError('Unauthorized webhook request', 401);
      }
    }

    const body = await req.json();

    /**
     * Parse fields across various Vietnam bank webhook formats:
     * - SePay: { content, transferAmount, referenceCode, transactionDate }
     * - Casso: { data: [{ description, amount, tid, when }] }
     * - PayOS / Custom: { description, amount, orderCode, code }
     */
    let content = '';
    let amount = 0;
    let referenceCode = '';

    if (body.data && Array.isArray(body.data) && body.data.length > 0) {
      // Casso format
      const tx = body.data[0];
      content = tx.description || tx.content || '';
      amount = Number(tx.amount || 0);
      referenceCode = String(tx.tid || tx.id || '');
    } else {
      // SePay / Direct format
      content = body.content || body.description || body.notes || '';
      amount = Number(body.transferAmount || body.amount || 0);
      referenceCode = String(body.referenceCode || body.code || body.orderCode || Date.now());
    }

    if (!content || amount <= 0) {
      return apiError('Invalid payload: missing transfer content or amount', 400);
    }

    // Extract Factory ID or code from transfer content: e.g. "ICEFLOW fac_123" or "IF fac_123" or raw ID
    const match = content.match(/(?:ICEFLOW|IF)[-_ ]?([a-zA-Z0-9_-]+)/i);
    const extractedId = match ? match[1] : null;

    // Preferred resolution: the payment note carries the subscription id
    // prefix (8 chars, see formatPaymentNote) as the last whitespace token —
    // unique per tenant, immune to name collisions or diacritics stripping.
    let factory = null;
    const lastToken = content.trim().split(/\s+/).pop() || '';
    const subIdPrefix = /^[A-Za-z0-9_-]{8,}$/.test(lastToken)
      ? lastToken.slice(0, 8).toLowerCase()
      : null;
    if (subIdPrefix) {
      const sub = await prismaAuth.subscription.findFirst({
        where: { id: { startsWith: subIdPrefix } },
        include: { factory: { include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
      });
      if (sub) factory = sub.factory;
    }

    // Find factory either by matching extractedId, or directly checking if content includes factory ID
    if (!factory && extractedId) {
      factory = await prismaAuth.factory.findFirst({
        where: {
          OR: [
            { id: extractedId },
            { id: { startsWith: extractedId } },
          ],
        },
        include: {
          subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
    }

    // Fallback: search all active factories if content contains their ID
    if (!factory) {
      const allFactories = await prismaAuth.factory.findMany({
        where: { isSystem: false },
        select: { id: true },
      });
      const found = allFactories.find((f) => content.toLowerCase().includes(f.id.toLowerCase()));
      if (found) {
        factory = await prismaAuth.factory.findUnique({
          where: { id: found.id },
          include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
        });
      }
    }

    if (!factory) {
      return apiError(`No factory found matching transfer content: "${content}"`, 404);
    }

    // Find super admin or factory owner to associate with payment
    const systemAdmin = await prismaAuth.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true },
    }) || await prismaAuth.user.findFirst({
      where: { factoryId: factory.id, role: 'ADMIN' },
      select: { id: true },
    });

    if (!systemAdmin) {
      return apiError('No admin account found to record payment', 500);
    }

    // Calculate extended subscription period (30 days per billing cycle)
    const currentSub = factory.subscriptions[0];
    const now = new Date();
    const currentEnd = currentSub?.endDate ? new Date(currentSub.endDate) : now;
    const baseDate = currentEnd > now ? currentEnd : now;
    const newEndDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Atomic transaction: Record Payment + Activate Subscription
    const [payment, subscription] = await prismaAuth.$transaction(async (tx) => {
      const payRecord = await tx.payment.create({
        data: {
          factoryId: factory.id,
          amount,
          adminId: systemAdmin.id,
          notes: `Tự động kích hoạt qua Webhook VietQR (Mã GD: ${referenceCode} | Nội dung: ${content})`,
        },
      });

      let subRecord;
      if (currentSub) {
        subRecord = await tx.subscription.update({
          where: { id: currentSub.id },
          data: {
            planType: 'PAID',
            status: 'ACTIVE',
            endDate: newEndDate,
          },
        });
      } else {
        subRecord = await tx.subscription.create({
          data: {
            factoryId: factory.id,
            planType: 'PAID',
            status: 'ACTIVE',
            startDate: now,
            endDate: newEndDate,
            driverCount: 0,
          },
        });
      }

      return [payRecord, subRecord];
    });

    // Send confirmation email to factory owner
    const owner = await prismaAuth.user.findFirst({
      where: { factoryId: factory.id, role: 'ADMIN' },
      select: { email: true, name: true },
    });
    if (owner?.email) {
      void sendPaymentSuccessEmail({
        to: owner.email,
        name: owner.name,
        factoryName: factory.name,
        amount,
        newEndDate: subscription.endDate,
      });
    }

    return apiSuccess({
      success: true,
      message: 'Gia hạn gói dịch vụ thành công qua Webhook',
      data: {
        factoryId: factory.id,
        factoryName: factory.name,
        paymentId: payment.id,
        amount,
        planType: subscription.planType,
        newEndDate: subscription.endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('[POST /api/webhooks/payment]', error);
    return apiError('Internal webhook processing error', 500);
  }
}
