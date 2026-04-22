import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prismaAuth } from '@/lib/db';

const basePrisma = prismaAuth;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const token = request.cookies.get('impersonate_token')?.value;

  if (token) {
    // Find and end the active impersonation
    await basePrisma.impersonationLog.updateMany({
      where: {
        token,
        endedAt: null,
      },
      data: {
        endedAt: new Date(),
      },
    });
  }

  const response = NextResponse.json({ success: true });

  // Clear the impersonation cookie
  response.cookies.set('impersonate_token', '', {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
}
