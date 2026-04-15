import { NextResponse, type NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  // Verify token if exists
  const session = token ? await verifyJWT(token) : null;

  // Protect /orders, /config, /customers routes
  const isProtected =
    request.nextUrl.pathname.startsWith('/orders') ||
    request.nextUrl.pathname.startsWith('/config') ||
    request.nextUrl.pathname.startsWith('/customers');

  if (isProtected && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
