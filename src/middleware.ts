import { NextResponse, type NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth';

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
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        url.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(url);
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
