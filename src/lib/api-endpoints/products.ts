/**
 * Products API Endpoints
 */

export const PRODUCT_ENDPOINTS = {
  BASE: '/api/products',
  BY_ID: (id: string) => `/api/products/${id}`,
} as const;

