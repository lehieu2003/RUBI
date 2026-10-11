import { cookies } from 'next/headers';
import { getSession, setSessionCookie, signJWT, verifyJWT } from '@/lib/auth';

// Use prismaAuth for global user lookups (no tenant filtering)
import { prismaAuth } from '@/lib/db';
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return apiSuccess({ user: null });
  }

  const user = await prismaAuth.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, factoryId: true, isActive: true, mustChangePassword: true },
  });

  if (!user) {
    return apiSuccess({ user: null });
  }

  const factoryId = session.factoryId ?? user.factoryId ?? undefined;
  if (!factoryId) {
    return apiError('Tài khoản chưa được gán nhà máy', 403);
  }

  // The middleware routes by the role inside the cookie. After the manager
  // changes someone's role, replace the cookie so the next page load goes to
  // the screens of the new role.
  const cookieToken = (await cookies()).get('auth_token')?.value;
  const cookieClaims = cookieToken ? await verifyJWT(cookieToken) : null;
  const roleChanged = cookieClaims !== null && cookieClaims.role !== user.role;

  if ((!session.factoryId && factoryId) || roleChanged) {
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      factoryId,
      mustChangePassword: user.mustChangePassword,
    });
    await setSessionCookie(token);
  }

  return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        factoryId,
        mustChangePassword: user.mustChangePassword,
      },
    });
}
