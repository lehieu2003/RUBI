import { NextResponse } from 'next/server';

/**
 * Standard API Response Structure across IceFlow
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

/**
 * Client-side counterpart to the envelope: unwraps `data` from a standard
 * response body, passing through anything that is not an envelope (plain
 * arrays, already-unwrapped payloads, null).
 */
export function unwrapEnvelope<T = unknown>(json: unknown): T {
  if (
    json &&
    typeof json === 'object' &&
    'data' in json &&
    (json as { data?: unknown }).data !== undefined
  ) {
    return (json as { data: T }).data;
  }
  return json as T;
}
