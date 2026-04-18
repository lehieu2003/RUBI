import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const basePrisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ factoryId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { factoryId } = await params;

  // Verify factory exists
  const factory = await basePrisma.factory.findUnique({
    where: { id: factoryId },
  });

  if (!factory) {
    return NextResponse.json({ error: 'Factory not found' }, { status: 400 });
  }

  // Create impersonation log
  const impersonation = await basePrisma.impersonationLog.create({
    data: {
      superAdminId: session.userId,
      factoryId,
    },
  });

  // Calculate expiresAt (15 minutes from now)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const response = NextResponse.json({
    success: true,
    token: impersonation.token,
    factoryName: factory.name,
    expiresAt: expiresAt.toISOString(),
  });

  // Set httpOnly cookie with impersonation token
  response.cookies.set('impersonate_token', impersonation.token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 900, // 15 minutes in seconds
  });

  return response;
}
