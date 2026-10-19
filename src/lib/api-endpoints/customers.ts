/**
 * Customers API Endpoints
 */

export const CUSTOMER_ENDPOINTS = {
  BASE: '/api/customers',
  DEBT_EXPORT: '/api/customers/debt-export',
  PAYMENTS: (id: string) => `/api/customers/${id}/payments`,
  LEDGER: (id: string) => `/api/customers/${id}/ledger`,
} as const;

