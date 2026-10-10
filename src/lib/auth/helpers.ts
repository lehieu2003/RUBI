import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// NOTE: These helper functions throw NextResponse objects as exceptions.
// Route handlers convert them into real responses with
// `if (error instanceof Response) return error;` in their catch block —
// Next.js route handlers do NOT serve a thrown Response by themselves.
// This pattern avoids the need for custom error classes while providing typed responses.

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.mustChangePassword) {
    throw NextResponse.json(
      { error: 'Bạn cần đổi mật khẩu trước khi tiếp tục', code: 'PASSWORD_CHANGE_REQUIRED' },
      { status: 403 }
    );
  }
  return session;
}

export async function requireRole(roles: string[]) {
  const session = await requireSession();
  if (!session.role || !roles.includes(session.role)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return session;
}

export async function requireFactoryId() {
  const session = await requireSession();
  if (!session.factoryId) {
    throw NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
  }
  return session;
}
