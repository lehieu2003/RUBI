import { NextRequest } from 'next/server';
import { prismaAuth } from '@/lib/db';
import { apiSuccess, apiError } from "@/lib/api-response";
import { sendTrialWarningEmail } from '@/lib/email/service';

// GET /api/cron/subscription-warnings — daily cron entry point.
// Sends expiry warning emails at exactly 3 days and 1 day remaining
// (a daily cron therefore fires each warning once, no duplicate state needed).
//
// Auth: Authorization: Bearer <CRON_SECRET>. Required in production —
// fail closed when unset (same posture as the payment webhook).

const WARNING_DAYS = [3, 1];

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (process.env.NODE_ENV === 'production' && !cronSecret) {
      console.error('[GET /api/cron/subscription-warnings] CRON_SECRET is required in production');
      return apiError('Cron not configured', 503);
    }

    const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (cronSecret && provided !== cronSecret) {
      return apiError('Unauthorized cron request', 401);
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Active subscriptions with a hard deadline (both TRIAL and PAID expire
    // by endDate — see isSubscriptionActive).
    const subscriptions = await prismaAuth.subscription.findMany({
      where: { status: 'ACTIVE', endDate: { gte: startOfToday } },
      include: { factory: { include: { users: { where: { role: 'ADMIN', isActive: true }, select: { email: true, name: true } } } } },
    });

    const sent: Array<{ factory: string; daysRemaining: number; to: string }> = [];

    for (const sub of subscriptions) {
      const msRemaining = new Date(sub.endDate).getTime() - now.getTime();
      const daysRemaining = Math.ceil(msRemaining / 86400000);

      if (!WARNING_DAYS.includes(daysRemaining)) continue;

      for (const admin of sub.factory.users) {
        await sendTrialWarningEmail({
          to: admin.email,
          name: admin.name,
          factoryName: sub.factory.name,
          daysRemaining,
        });
        sent.push({ factory: sub.factory.name, daysRemaining, to: admin.email });
      }
    }

    return apiSuccess({
      checked: subscriptions.length,
      sentCount: sent.length,
      sent,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/cron/subscription-warnings]', error);
    return apiError('Cron failed', 500);
  }
}
