import { apiError } from '@/lib/api-response';
import { getSession } from '@/lib/auth';

// NOTE: These helper functions throw NextResponse objects (built by apiError) as exceptions.
// Route handlers convert them into real responses with
// `if (error instanceof Response) return error;` in their catch block —
// Next.js route handlers do NOT serve a thrown Response by themselves.
// This pattern avoids the need for custom error classes while providing typed responses.

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw apiError('Chưa đăng nhập hoặc phiên đã hết hạn', 401);
  }
  if (session.mustChangePassword) {
    throw apiError('Bạn cần đổi mật khẩu trước khi tiếp tục', 403, 'PASSWORD_CHANGE_REQUIRED');
  }
  return session;
}

export async function requireRole(roles: string[]) {
  const session = await requireSession();
  if (!session.role || !roles.includes(session.role)) {
    throw apiError('Bạn không có quyền thực hiện thao tác này', 403);
  }
  return session;
}

export async function requireFactoryId() {
  const session = await requireSession();
  if (!session.factoryId) {
    throw apiError('Tài khoản chưa được gán nhà máy', 400);
  }
  return session;
}
