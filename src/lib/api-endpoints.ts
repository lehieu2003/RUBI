/**
 * IceFlow - API Endpoints Registry
 * Toàn bộ URL endpoints của hệ thống được tập trung tại đây.
 * Khi cần thay đổi route/path, chỉ cần cập nhật file này.
 */

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },

  // Factory
  FACTORY: {
    ONBOARDING: '/api/factory/onboarding',
  },

  // Orders
  ORDERS: {
    BASE: '/api/orders',
    BULK_ASSIGN: '/api/orders/bulk-assign',
    STATUS: (id: string) => '/api/orders/' + id + '/status',
    CONFIRM: (id: string) => '/api/orders/' + id + '/confirm',
    RECONCILE: (id: string) => '/api/orders/' + id + '/reconcile',
  },

  // Customers
  CUSTOMERS: {
    BASE: '/api/customers',
    IMPORT: '/api/customers/import',
    DEBT_EXPORT: '/api/customers/debt-export',
  },

  // Products & Pricing
  PRODUCTS: {
    BASE: '/api/products',
  },
  INVENTORY: {
    BASE: '/api/inventory',
  },
  ASSETS: {
    BASE: '/api/assets',
    DETAIL: (id: string) => `/api/assets/${id}`,
    MAINTENANCE: (id: string) => `/api/assets/${id}/maintenance`,
  },
  PRICES: {
    GLOBAL: '/api/prices/global',
    CUSTOMER_OVERRIDE: '/api/prices/customer/override',
  },

  // Drivers & Vehicles
  DRIVERS: {
    BASE: '/api/drivers',
  },
  DRIVER_APP: {
    ORDERS: '/api/driver/orders',
  },

  // Staff
  STAFF: {
    BASE: '/api/staff',
    DETAIL: (id: string) => '/api/staff/' + id,
  },

  // Schedule & Shifts
  SCHEDULE: {
    ASSIGNMENTS: '/api/schedule/assignments',
  },

  // Deposits (Vỏ bao)
  DEPOSITS: {
    SHELLS: '/api/deposits/shells',
  },

  // Reports
  REPORTS: {
    DEBT: '/api/reports/debt',
  },
} as const;

export default API_ENDPOINTS;
