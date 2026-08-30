import { NextResponse, type NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { canAccessPath, isTenantAppPath } from '@/lib/rbac/permissions';
import { setTenantContext, TenantContext } from '@/lib/tenant';

type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'STAFF' | 'DRIVER' | 'SUPER_ADMIN';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
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

  // Check role-based access in pure memory (0ms network delay)
  if (session) {
    const userRole = (session as { role?: UserRole }).role as UserRole | undefined;
    if (isAppRoute && !canAccessPath(userRole, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = userRole === 'SUPER_ADMIN' ? '/admin/dashboard' : userRole === 'DRIVER' ? '/driver' : '/dashboard';
      url.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(url);
    }

    // Fast memory-check for Impersonation (reject write if impersonation cookie exists)
    if (request.method !== 'GET' && pathname.startsWith('/api/')) {
      const impersonateToken = request.cookies.get('impersonate_token')?.value;
      if (impersonateToken) {
        return NextResponse.json(
          { error: 'Read-only during impersonation. End impersonation to make changes.', code: 'READ_ONLY_IMPERSONATION' },
          { status: 403 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
