import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { setTenantContext } from '@/lib/tenant';
import { prismaAuth } from '@/lib/db';

// At module scope — throws immediately in production if JWT_SECRET is not configured
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is required in production. ' +
    'Set it to a cryptographically random string of at least 32 characters.'
  );
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET // no hardcoded fallback
);

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role?: string;
  factoryId?: string;
}

export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  const session = await verifyJWT(token);
  if (session) {
    // During an impersonation session the SUPER_ADMIN acts on the tenant:
    // swap the session's factoryId to the impersonated factory so every
    // tenant-scoped query targets the right data. Writes stay blocked by
    // the middleware's READ_ONLY_IMPERSONATION guard.
    const impersonateToken = cookieStore.get('impersonate_token')?.value;
    if (session.role === 'SUPER_ADMIN' && impersonateToken) {
      const impersonationLog = await prismaAuth.impersonationLog.findUnique({
        where: { token: impersonateToken },
        select: { factoryId: true, endedAt: true },
      });
      if (impersonationLog && !impersonationLog.endedAt) {
        session.factoryId = impersonationLog.factoryId;
      }
    }
    // Propagate tenant context so Prisma $extends hooks work in API route handlers
    setTenantContext(session.factoryId ?? null, session.role as 'ADMIN' | 'ACCOUNTANT' | 'STAFF' | 'DRIVER' | 'SUPER_ADMIN' | null);
  }
  return session;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}
