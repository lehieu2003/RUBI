import { NextResponse, type NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { getFactorySubscription, isSubscriptionActive, isGracePeriodExpired } from '@/lib/subscription-status';

type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'STAFF';

// Routes accessible by role
const roleRoutes: Record<string, UserRole[]> = {
  '/dashboard': ['ADMIN', 'ACCOUNTANT', 'STAFF'],
  '/orders': ['ADMIN', 'ACCOUNTANT', 'STAFF'],
  '/customers': ['ADMIN', 'ACCOUNTANT', 'STAFF'],
  '/settle': ['ADMIN', 'ACCOUNTANT'],
  '/inventory': ['ADMIN', 'ACCOUNTANT'],
  '/vehicles': ['ADMIN', 'ACCOUNTANT'],
  '/settings': ['ADMIN'],
};

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const session = token ? await verifyJWT(token) : null;

  const { pathname } = request.nextUrl;

  // Protect all app routes (require auth)
  const isAppRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/settle') ||
    pathname.startsWith('/inventory') ||
    pathname.startsWith('/vehicles') ||
    pathname.startsWith('/settings');

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

  // Check role-based access
  if (session) {
    const userRole = (session as { role?: UserRole }).role as UserRole | undefined;
    const allowedRoles = roleRoutes[pathname] || roleRoutes[pathname.split('/')[2] + '/'] || ['ADMIN', 'ACCOUNTANT', 'STAFF'];

    // Check exact pathname match first
    if (roleRoutes[pathname] && userRole && !roleRoutes[pathname].includes(userRole)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(url);
    }

    // Check parent segment (e.g. /settings/*)
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      const parentPath = '/' + segments.slice(0, 2).join('/');
      if (roleRoutes[parentPath] && userRole && !roleRoutes[parentPath].includes(userRole)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        url.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(url);
      }
    }

    // Subscription enforcement for non-GET API requests
    if (request.method !== 'GET' && pathname.startsWith('/api/')) {
      const factoryId = (session as { factoryId?: string }).factoryId;
      if (factoryId) {
        try {
          const sub = await getFactorySubscription(factoryId);
          if (sub) {
            if (sub.status === 'CANCELLED' && isGracePeriodExpired(sub)) {
              return NextResponse.json(
                { error: 'Subscription cancelled and grace period expired. Account locked.', code: 'ACCOUNT_LOCKED' },
                { status: 403 }
              );
            }
            if (!isSubscriptionActive(sub)) {
              return NextResponse.json(
                { error: 'Subscription inactive. System is read-only.', code: 'READ_ONLY' },
                { status: 403 }
              );
            }
          }
        } catch {
          // Fail open on DB errors
        }
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
