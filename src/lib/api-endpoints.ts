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
    PASSWORD: '/api/auth/password',
  },

  // Factory
  FACTORY: {
    PROFILE: '/api/factory',
  },

  // Orders
  ORDERS: {
    BASE: '/api/orders',
    COUNTS: '/api/orders/counts',
    BULK_ASSIGN: '/api/orders/bulk-assign',
    STATUS: (id: string) => '/api/orders/' + id + '/status',
    CONFIRM: (id: string) => '/api/orders/' + id + '/confirm',
    RECONCILE: (id: string) => '/api/orders/' + id + '/reconcile',
  },

  // Customers
  CUSTOMERS: {
    BASE: '/api/customers',
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
    MY: '/api/schedule/my',
    REVIEW: '/api/schedule/review',
  },

  // Deposits (Vỏ bao)
  DEPOSITS: {
    SHELLS: '/api/deposits/shells',
  },

  // Reports
  REPORTS: {
    DEBT: '/api/reports/debt',
    SHIFTS: '/api/reports/shifts',
    SHIFTS_LOCK: '/api/reports/shifts/lock',
  },
} as const;

export default API_ENDPOINTS;
