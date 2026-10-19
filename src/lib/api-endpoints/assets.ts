/**
 * Assets API Endpoints
 */

export const ASSET_ENDPOINTS = {
  BASE: '/api/assets',
  DETAIL: (id: string) => `/api/assets/${id}`,
  MAINTENANCE: (id: string) => `/api/assets/${id}/maintenance`,
} as const;

