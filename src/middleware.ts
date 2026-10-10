import { NextResponse, type NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { canAccessPath, isTenantAppPath } from '@/lib/rbac/permissions';
import { setTenantContext, TenantContext } from '@/lib/tenant';

type UserRole = 'ADMIN' | 'STAFF' | 'DRIVER';

export async function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : request.cookies.get('auth_token')?.value;
  const session = token ? await verifyJWT(token) : null;

  // Set tenant context for Prisma  hooks (auto-injects factoryId filter)
  if (session) {
    setTenantContext(
      (session as { factoryId?: string }).factoryId ?? null,
      (session as { role?: string }).role as TenantContext['role'] ?? null
    );
  }

  const { pathname } = request.nextUrl;

  // Protect all tenant app routes (require auth)
  const isAppRoute = isTenantAppPath(pathname);

  // Redirect unauthenticated users to login
  if (isAppRoute && !session) {
    // For API routes, return 401 JSON instead of redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // No public landing page: "/" goes straight to login
  if (pathname === '/' && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from the login page (and "/")
  const isAuthRoute = pathname === '/login' || pathname === '/';
  if (session && isAuthRoute) {
    const userRole = (session as { role?: UserRole }).role as UserRole | undefined;
    const url = request.nextUrl.clone();
    url.pathname = userRole === 'DRIVER' ? '/driver' : '/dashboard';
    return NextResponse.redirect(url);
  }

  // Check role-based access in pure memory (0ms network delay)
  if (session) {
    const userRole = (session as { role?: UserRole }).role as UserRole | undefined;

    if (isAppRoute && !canAccessPath(userRole, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = userRole === 'DRIVER' ? '/driver' : '/dashboard';
      url.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
