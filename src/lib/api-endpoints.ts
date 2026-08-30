/**
 * IceFlow SaaS - API Endpoints Registry
 * Toàn bộ URL endpoints của hệ thống được tập trung tại đây.
 * Khi cần thay đổi route/path, chỉ cần cập nhật file này.
 */

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
    ME: '/api/auth/me',
  },

  // Tenant / Factory
  FACTORY: {
    ONBOARDING: '/api/factory/onboarding',
  },

  // Orders
  ORDERS: {
    BASE: '/api/orders',
    MAP: '/api/orders/map',
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

  // Payments & Billing
  PAYMENTS: {
    CONFIRM: '/api/payments/confirm',
  },
  BILLING: {
    SUBSCRIPTION: '/api/billing/subscription',
  },
  SUBSCRIPTIONS: {
    DETAIL: (id: string) => '/api/subscriptions/' + id,
    CANCEL: '/api/subscriptions/cancel',
  },

  // Reports
  REPORTS: {
    DEBT: '/api/reports/debt',
  },

  // Super Admin
  ADMIN: {
    STATS: '/api/admin/stats',
    PAYMENTS: '/api/admin/payments',
    FACTORIES: '/api/admin/factories',
    FACTORY_DETAIL: (factoryId: string) => '/api/admin/factories/' + factoryId,
    SUBSCRIPTION_DETAIL: (id: string) => '/api/admin/subscriptions/' + id,
    AUDIT_LOGS: '/api/admin/audit-logs',
    AUDIT_LOGS_EXPORT: '/api/admin/audit-logs/export',
    IMPERSONATE: {
      START: (factoryId: string) => '/api/admin/impersonate/' + factoryId,
      END: '/api/admin/impersonate/end',
      STATUS: '/api/admin/impersonate/status',
    },
  },
} as const;

export default API_ENDPOINTS;
