import { NextResponse } from 'next/server';

/**
 * Standard API Response Structure across IceFlow SaaS
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: unknown;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

/**
 * Helper to return a standardized successful JSON response
 */
export function apiSuccess<T>(
  data: T,
  status: number = 200,
  meta?: ApiResponse['meta']
): NextResponse<ApiResponse<T>> {
  const body: ApiResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return NextResponse.json(body, { status });
}

/**
 * Helper to return a standardized error JSON response
 */
export function apiError(
  message: string,
  status: number = 400,
  code?: string,
  details?: unknown
): NextResponse<ApiResponse<never>> {
  const body: ApiResponse<never> = {
    success: false,
    error: message,
    ...(code ? { code } : {}),
    ...(details ? { details } : {}),
  };
  return NextResponse.json(body, { status });
}
