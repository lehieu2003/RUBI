# Architecture: Multi-tenant Factory System

## Context

Adding multi-tenant factory architecture to IceFlow SaaS. Existing system has:
- Next.js 15 App Router, Supabase PostgreSQL, Prisma ORM
- JWT auth with factoryId in token payload
- Factory owner = ADMIN user with `isFactoryOwner: true` and `factoryId = self.id`
- Subscription model tracks factory billing (factoryId → subscription)
- Existing models: User, Order, Customer, Product, Driver, OrderItem, Inventory, etc.

**Current gap**: No `factoryId` on Order, Customer, Product, Driver, or any operational models. All data is currently single-tenant (one factory's data). Multi-tenancy requires factory_id scoping on every operational query.

---

## 1. Database Schema Changes

### New Model: Factory

```prisma
model Factory {
  id        String   @id @default(cuid())
  name      String
  phone     String?
  address   String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users         User[]
  customers     Customer[]
  products      Product[]
  drivers       Driver[]
  orders        Order[]
  // inventory and other factory-scoped data

  @@map("factories")
}
```

### Schema Changes to Existing Models

| Model | Change | Rationale |
|-------|--------|-----------|
| `User` | `factoryId` becomes non-nullable FK to Factory | All users belong to a factory |
| `Customer` | Add `factoryId` FK to Factory | Each customer belongs to a factory |
| `Product` | Add `factoryId` FK to Factory | Factory sets its own products/pricing |
| `Driver` | Add `factoryId` FK to Factory | Factory manages its own drivers |
| `Order` | Add `factoryId` FK to Factory | Orders belong to factory (current is implicit) |
| `OrderItem` | No change | Scoped via Order |
| `Inventory` | Add `factoryId` FK to Factory | Per-factory inventory tracking |
| `GlobalPrice` | Add `factoryId` FK to Factory | Per-factory global pricing |
| `CustomerPriceOverride` | Add `factoryId` FK to Factory | Per-factory price overrides |
| `CustomerDebtLedger` | Add `factoryId` FK to Factory | Per-factory debt tracking |
| `CustomerShellDeposit` | Add `factoryId` FK to Factory | Per-factory shell deposits |

### Migration Sequence

1. Add `Factory` table
2. Migrate existing `factoryId` in User to FK
3. Add `factoryId` to Customer, Product, Driver, Order, Inventory, GlobalPrice, CustomerPriceOverride, CustomerDebtLedger, CustomerShellDeposit
4. Backfill factoryId for existing records using admin user's factoryId (self-referencing)

**Note**: Subscription already has factoryId. After migration, Factory becomes the canonical factory entity and Subscription links to it (1:1).

---

## 2. Tenant Context Propagation

### 2.1 Auth Flow (unchanged, already has factoryId)

JWT payload already contains `factoryId`. Register/login returns factoryId in token.

### 2.2 Middleware Enhancement

Current middleware handles auth and subscription. **No new middleware layer needed** — factory context is already in the JWT.

However, **route structure must change** to support Super Admin:

```
/admin                    Super Admin only (manage factories, view all)
  /factories              List all factories
  /factories/[id]         Factory detail
  /factories/[id]/users   Factory users
  /factories/[id]/data    Factory operational data

/app                      Factory-scoped routes (current structure)
  /dashboard
  /orders
  /customers
  /settle
  /inventory
  /vehicles
  /settings
```

### 2.3 Server-Side Factory Context Extraction

Create a utility to extract factory context from session:

```typescript
// src/lib/factory-context.ts
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function getFactoryContext() {
  const session = await getSession();
  if (!session?.factoryId) {
    throw new Error('No factory context');
  }
  return { factoryId: session.factoryId };
}
```

Use in Server Components and Server Actions:

```typescript
// In a Server Action
async function createOrder(data: OrderInput) {
  const { factoryId } = await getFactoryContext();
  return prisma.order.create({
    data: { ...data, factoryId }
  });
}
```

### 2.4 Prisma Client Enhancement for Automatic Factory Scoping

Add a thin Prisma wrapper that injects `factoryId` into queries:

```typescript
// src/lib/db-tenant.ts
import { prisma } from './db';
import { getSession } from './auth';

export async function prismaWithTenant() {
  const session = await getSession();
  if (!session?.factoryId) {
    throw new Error('No factory context');
  }

  // Return a prisma client instance with factory context
  // This is a wrapper, not a new Prisma client instance
  return {
    order: {
      findMany: (args) => prisma.order.findMany({ ...args, where: { ...args.where, factoryId: session.factoryId } }),
      findUnique: (args) => prisma.order.findUnique({ ...args, where: { ...args.where, factoryId: session.factoryId } }),
      create: (args) => prisma.order.create({ ...args, data: { ...args.data, factoryId: session.factoryId } }),
      // ... extend as needed
    },
    // ... other models
  };
}
```

**Alternative (simpler, recommended)**: Add a `prisma` singleton with no automatic injection. Require every query to explicitly include `factoryId` via shared helper:

```typescript
// src/lib/queries.ts
import { prisma } from './db';
import { getSession } from './auth';

export async function withFactoryContext<T>(fn: (factoryId: string) => Promise<T>): Promise<T> {
  const session = await getSession();
  if (!session?.factoryId) throw new Error('Unauthorized');
  return fn(session.factoryId);
}

// Usage
const orders = await withFactoryContext(factoryId =>
  prisma.order.findMany({ where: { status: 'PENDING' } })
);
```

---

## 3. Data Seeding Per Factory

### 3.1 Factory Provisioning on Registration

Current registration creates User + Subscription. **After migration, registration must**:

1. Create Factory record
2. Create admin User linked to Factory
3. Create Subscription linked to Factory
4. Seed default Product data (optional, factory can add later)

```typescript
// Registration flow (updated)
async function registerFactory(data: RegisterInput) {
  return prisma.$transaction(async (tx) => {
    // 1. Create factory
    const factory = await tx.factory.create({ data: { name: data.factoryName } });

    // 2. Create admin user linked to factory
    const user = await tx.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        phone: data.phone,
        role: 'ADMIN',
        factoryId: factory.id,
        isFactoryOwner: true,
      }
    });

    // 3. Create trial subscription
    await tx.subscription.create({
      data: {
        factoryId: factory.id,
        planType: 'TRIAL',
        startDate: new Date(),
        endDate: trialEndDate,
        status: 'ACTIVE',
      }
    });

    // 4. Seed default products (optional)
    await tx.product.createMany({
      data: defaultProducts.map(p => ({ ...p, factoryId: factory.id }))
    });

    return { factory, user };
  });
}
```

### 3.2 Super Admin Factory Management

Super Admin needs API to:
- List all factories
- View factory details (user count, order count, subscription status)
- Suspend/reactivate factory
- Access factory data directly (for support)

---

## 4. API Route Changes

### 4.1 Factory-scoped Routes (most routes)

All `/api/*` routes inside `/app/api/` are factory-scoped. Every handler must:
- Extract factoryId from session (JWT cookie)
- Include factoryId in all Prisma queries

```typescript
// Pattern for all factory-scoped handlers
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.factoryId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { factoryId: session.factoryId }
  });
  return NextResponse.json(orders);
}
```

### 4.2 Super Admin Routes

New routes under `/api/admin/`:
- `GET /api/admin/factories` — list all factories
- `GET /api/admin/factories/[id]` — factory details
- `GET /api/admin/factories/[id]/users` — factory users
- `POST /api/admin/factories/[id]/suspend` — suspend factory
- `POST /api/admin/factories/[id]/activate` — reactivate factory

---

## 5. Integration Points

### 5.1 Auth (unchanged)
- JWT already has factoryId
- Login/register routes already set factoryId

### 5.2 Middleware (minimal change)
- Add route group for `/admin` (Super Admin only)
- Existing `/dashboard`, `/orders`, etc. remain factory-scoped
- Middleware checks role for admin routes, factoryId presence for all app routes

### 5.3 Prisma Client
- Add factoryId to all operational models
- No new Prisma client needed
- Every query must include factoryId in where clause
- Consider shared query helper to avoid repetition

### 5.4 TanStack Query
- No changes needed; query factory context comes from server
- Server Actions handle factory scoping

---

## 6. New vs Modified Components

### New Components

| Component | Purpose |
|-----------|---------|
| `Factory` model + migration | Core tenant entity |
| `prisma-tenant.ts` / `queries.ts` | Factory context helper |
| `/admin/*` routes | Super Admin management |
| Factory provisioning in register | Creates factory on signup |

### Modified Components

| Component | Change |
|-----------|--------|
| `prisma/schema.prisma` | Add factoryId FK to 9+ models, add Factory model |
| `middleware.ts` | Add admin route group, role check for super admin |
| `src/lib/auth.ts` | No change (already has factoryId) |
| `src/app/api/auth/register/route.ts` | Create Factory, seed products |
| `src/app/api/auth/login/route.ts` | No change needed |
| All `src/app/api/*/route.ts` | Add factoryId to queries |

---

## 7. Suggested Build Order

### Phase 1: Database Foundation
1. Add Factory model and migrate schema
2. Add factoryId to all operational models
3. Write migration script to backfill factoryId for existing data
4. Update register route to create Factory entity

### Phase 2: Query Scoping
5. Create `withFactoryContext` helper
6. Update all API routes to use factory context
7. Verify no orphan records (queries without factoryId)

### Phase 3: Super Admin
8. Add `/admin/*` routes
9. Update middleware for admin route group
10. Factory management UI (list, detail, suspend)

### Phase 4: Validation & Cleanup
11. Add unique constraints (factoryId + entity unique where needed)
12. Indexes on factoryId + common query patterns
13. Test multi-factory isolation

---

## 8. Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Forgetting factoryId in a query (data leak) | Shared query helper + lint rule |
| Existing data has no factoryId | Migration with admin's self-referencing factoryId |
| Super Admin routes accidentally factory-scoped | Separate route group with explicit middleware |
| Subscription → Factory relationship | 1:1 after migration; update subscription.factoryId → FK |

---

## 9. Out of Scope

- Tenant isolation at database level (Row Level Security) — PostgreSQL RLS adds complexity; application-level scoping sufficient for v1
- Tenant-specific subdomain routing — all factory access via same domain, distinguished by auth
- Migrating existing single-tenant data to multi-tenant — backfill uses admin's self-factoryId (no real multi-tenant data exists yet)