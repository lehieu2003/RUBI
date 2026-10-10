// Building blocks shared by every API contract.
//
// A contract describes one HTTP endpoint as it behaves today: who may call
// it, what it accepts and what it returns. The schemas here are the single
// description used by the generated docs (docs/openapi.json,
// docs/API-CONTRACT.md) and by the live verification (npm run contract:verify).

import { z } from 'zod';

export type Role = 'ADMIN' | 'STAFF' | 'DRIVER';
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type ContractAuth =
  /** No session needed */
  | { kind: 'public' }
  /** Any signed-in user (cookie `auth_token` or `Authorization: Bearer <JWT>`) */
  | { kind: 'session' }
  /** Signed-in user with one of these roles */
  | { kind: 'roles'; roles: Role[] }
  /** A rule that does not fit the kinds above, described in words */
  | { kind: 'custom'; description: string };

export interface ApiContract {
  /** Stable identifier, also used as the OpenAPI operationId */
  id: string;
  method: HttpMethod;
  /** Path with `{param}` placeholders, e.g. /api/orders/{id}/status */
  path: string;
  tag: string;
  summary: string;
  auth: ContractAuth;
  params?: z.ZodObject;
  query?: z.ZodObject;
  body?: z.ZodType;
  /** HTTP status of the success response (default 200) */
  successStatus?: number;
  /** Full JSON body of the success response */
  response: z.ZodType;
  /** Error statuses this endpoint is known to return */
  errors: number[];
  notes?: string;
}

/** `{ success: true, data }` — what `apiSuccess()` produces. */
export const envelope = <T extends z.ZodType>(data: T) => z.object({ success: z.literal(true), data });

/** Error body: `{ success: false, error, code? }`, from every endpoint, guard and the middleware. */
export const ErrorResponse = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
}).meta({ id: 'Error' });

/** Standard pagination metadata of list responses. */
export const PaginationMeta = z
  .object({
    page: z.number().int().min(1).meta({ description: 'Current 1-based page number', example: 1 }),
    limit: z.number().int().min(1).max(200).meta({ description: 'Items per page limit', example: 20 }),
    total_item: z.number().int().min(0).meta({ description: 'Total matching item count', example: 100 }),
    total_page: z.number().int().min(0).meta({ description: 'Total number of pages', example: 5 }),
  })
  .meta({ id: 'PaginationMeta', description: 'Standard pagination metadata for list responses' });

/** Query parameters of a paginated list: `?page=1&limit=20`. */
export const paginationQuery = {
  page: z.string().regex(/^\d+$/).optional().meta({ description: '1-based page number (default 1)', example: '1' }),
  limit: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .meta({ description: 'Items per page (default 20, maximum 200)', example: '20' }),
};

/** `{ success: true, data: [...], meta }` — a paginated list. */
export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({ success: z.literal(true), data: z.array(item), meta: PaginationMeta });

export const Id = z.string().min(1);
/** ISO 8601 timestamp as produced by JSON-serialising a Date */
export const IsoDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'ISO 8601 timestamp');
/** Calendar date, YYYY-MM-DD */
export const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
/** Calendar month, YYYY-MM */
export const MonthOnly = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM');

export const RoleEnum = z.enum(['ADMIN', 'STAFF', 'DRIVER']);
export const OrderStatus = z.enum(['PENDING', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED']);
export const Shift = z.enum([
  'SLOT_00_03',
  'SLOT_03_06',
  'SLOT_06_09',
  'SLOT_09_12',
  'SLOT_12_15',
  'SLOT_15_18',
  'SLOT_18_21',
  'SLOT_21_24',
]);
export const ShiftStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const Success = z.object({ success: z.literal(true) });

// ---- Records returned as stored (Prisma rows serialised to JSON) ----

export const Customer = z.object({
  id: Id,
  code: z.string(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  isActive: z.boolean(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  factoryId: Id,
}).meta({ id: 'Customer' });

export const Product = z.object({
  id: Id,
  name: z.string(),
  sizeKg: z.number().int(),
  unit: z.string(),
  isActive: z.boolean(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  factoryId: Id,
}).meta({ id: 'Product' });

const orderFields = {
  id: Id,
  customerId: Id,
  status: OrderStatus,
  notes: z.string().nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  driverId: Id.nullable(),
  assignerId: Id.nullable(),
  deliveredAt: IsoDateTime.nullable(),
  factoryId: Id,
};

/** Order without its relations. */
export const OrderRow = z.object({ ...orderFields, total: z.number() }).meta({ id: 'OrderRow' });

/** Order with customer and items, as the list endpoints return it. */
export const OrderWithItems = z.object({
  ...orderFields,
  total: z.number(),
  customer: Customer,
  orderItems: z.array(
    z.object({
      id: Id,
      orderId: Id,
      productId: Id,
      quantity: z.number().int(),
      unitPrice: z.number(),
      lineTotal: z.number(),
      actualQty: z.number().int().nullable(),
      product: Product,
    })
  ),
}).meta({ id: 'OrderWithItems' });

export const roles = (...list: Role[]): ContractAuth => ({ kind: 'roles', roles: list });
export const session: ContractAuth = { kind: 'session' };
export const publicAccess: ContractAuth = { kind: 'public' };
