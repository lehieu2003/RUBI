import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
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
  // Mobile clients (Flutter) send the JWT in an Authorization: Bearer header;
  // the web app keeps using the httpOnly auth_token cookie. A Bearer token
  // wins when present; without one, resolution falls back to the cookie.
  let authHeader: string | null = null;
  try {
    authHeader = (await headers()).get('authorization');
  } catch {
    authHeader = null; // headers() unavailable outside request scope — cookie-only
  }
  const bearerToken =
    authHeader && /^bearer /i.test(authHeader) ? authHeader.slice(7).trim() : null;
  const cookieStore = await cookies();
  const token = bearerToken || cookieStore.get('auth_token')?.value;
  if (!token) return null;
  const session = await verifyJWT(token);
  if (session) {
    // A JWT stays valid for 7 days — re-check the account state so a
    // deactivated (Khóa) or deleted user loses access immediately instead
    // of riding out the token lifetime.
    const userState = await prismaAuth.user.findUnique({
      where: { id: session.userId },
      select: { isActive: true },
    });
    if (!userState || !userState.isActive) {
      return null;
    }
    // Propagate tenant context so Prisma $extends hooks work in API route handlers
    setTenantContext(session.factoryId ?? null, session.role as 'ADMIN' | 'ACCOUNTANT' | 'STAFF' | 'DRIVER' | null);
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
