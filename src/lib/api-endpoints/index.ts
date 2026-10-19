/**
 * IceFlow - API Endpoints Registry
 * Toàn bộ URL endpoints của hệ thống được tách theo domain/feature,
 * đồng thời cung cấp registry hợp nhất để tương thích ngược.
 */

import { AUTH_ENDPOINTS } from './auth';
import { AUDIT_ENDPOINTS } from './audit';
import { FACTORY_ENDPOINTS } from './factory';
import { ORDER_ENDPOINTS } from './orders';
import { CUSTOMER_ENDPOINTS } from './customers';
import { PRODUCT_ENDPOINTS } from './products';
import { INVENTORY_ENDPOINTS } from './inventory';
import { ASSET_ENDPOINTS } from './assets';
import { PRICE_ENDPOINTS } from './prices';
import { DRIVER_ENDPOINTS } from './drivers';
import { STAFF_ENDPOINTS } from './staff';
import { SCHEDULE_ENDPOINTS } from './schedule';
import { DEPOSIT_ENDPOINTS } from './deposits';
import { REPORT_ENDPOINTS } from './reports';

export * from './auth';
export * from './audit';
export * from './factory';
export * from './orders';
export * from './customers';
export * from './products';
export * from './inventory';
export * from './assets';
export * from './prices';
export * from './drivers';
export * from './staff';
export * from './schedule';
export * from './deposits';
export * from './reports';

export const API_ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  AUDIT_LOGS: AUDIT_ENDPOINTS.LOGS,
  FACTORY: FACTORY_ENDPOINTS,
  ORDERS: ORDER_ENDPOINTS,
  CUSTOMERS: CUSTOMER_ENDPOINTS,
  PRODUCTS: PRODUCT_ENDPOINTS,
  INVENTORY: INVENTORY_ENDPOINTS,
  ASSETS: ASSET_ENDPOINTS,
  PRICES: PRICE_ENDPOINTS,
  DRIVERS: {
    BASE: DRIVER_ENDPOINTS.BASE,
  },
  DRIVER_APP: {
    ORDERS: DRIVER_ENDPOINTS.APP_ORDERS,
  },
  STAFF: STAFF_ENDPOINTS,
  SCHEDULE: SCHEDULE_ENDPOINTS,
  DEPOSITS: DEPOSIT_ENDPOINTS,
  REPORTS: REPORT_ENDPOINTS,
} as const;

export default API_ENDPOINTS;

