/**
 * Orders API Endpoints
 */

export const ORDER_ENDPOINTS = {
  BASE: '/api/orders',
  COUNTS: '/api/orders/counts',
  BULK_ASSIGN: '/api/orders/bulk-assign',
  STATUS: (id: string) => `/api/orders/${id}/status`,
  CONFIRM: (id: string) => `/api/orders/${id}/confirm`,
  RECONCILE: (id: string) => `/api/orders/${id}/reconcile`,
} as const;

