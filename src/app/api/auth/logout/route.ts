import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST() {
  await clearSessionCookie();
  return apiSuccess({ success: true });
}
