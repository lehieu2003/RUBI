/**
 * Staff API Endpoints
 */

export const STAFF_ENDPOINTS = {
  BASE: '/api/staff',
  DETAIL: (id: string) => `/api/staff/${id}`,
} as const;

