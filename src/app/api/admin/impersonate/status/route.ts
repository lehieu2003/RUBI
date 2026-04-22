import { NextRequest, NextResponse } from 'next/server';
import { prismaAuth } from '@/lib/db';

const basePrisma = prismaAuth;

export async function GET(request: NextRequest) {
  const token = request.cookies.get('impersonate_token')?.value;

  if (!token) {
    return NextResponse.json({ active: false });
  }

  // Check if token exists, is not expired (15min), and not ended
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  const impersonation = await basePrisma.impersonationLog.findFirst({
    where: {
      token,
      startedAt: { gte: fifteenMinutesAgo },
      endedAt: null,
    },
    select: { factoryId: true },
  });

  return NextResponse.json({
    active: !!impersonation,
    factoryId: impersonation?.factoryId ?? null,
  });
}
