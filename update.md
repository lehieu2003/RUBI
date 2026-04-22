# IceFlow SaaS Update Notes

Date: 2026-04-22

## Context

This document summarizes the codebase review and follow-up discussion about registration, SaaS readiness, and the tenant data leak observed when different factories sign up but see another factory's dashboard data.

## Current State

IceFlow is a Next.js App Router SaaS app using Prisma/Postgres, JWT cookie auth, factory-based tenancy, and trial subscriptions.

The current registration flow is an MVP self-serve tenant signup:

- User fills in factory name, phone, manager name, email, and password.
- `/api/auth/register` creates a `Factory`, an owner `User`, and a `TRIAL` `Subscription`.
- The app signs a JWT with `factoryId` and sets `auth_token`.
- The register page redirects every successful signup to `/dashboard`.

This is enough for an MVP, but not yet production-grade SaaS.

## Critical Issues

### 1. Tenant data leak on dashboard

Different factories can see data from other factories because dashboard server queries are not scoped by `factoryId`.

Current pattern in `src/app/dashboard/page.tsx`:

```ts
prisma.customer.findMany({
  where: { isActive: true },
});

prisma.product.findMany({
  where: { isActive: true },
});

prisma.order.findMany({
  orderBy: { createdAt: 'desc' },
  take: 50,
});
```

These queries read all tenant data.

The app tries to set tenant context in middleware via `AsyncLocalStorage`, then auto-filter in `src/lib/db.ts`, but this is unreliable in Next.js App Router because middleware and route/server component execution do not share the same reliable async context.

Worse, the Prisma extension currently fails open:

```ts
if (ctx.factoryId) {
  args.where = { ...args.where, factoryId: ctx.factoryId };
}
return query(args);
```

If `ctx.factoryId` is missing, the query runs without tenant filtering.

Required fix:

- Do not rely on middleware `AsyncLocalStorage` for tenant filtering.
- In every tenant-scoped query, explicitly filter by `session.factoryId`.
- Fail closed if a non-super-admin session has no `factoryId`.

Example dashboard fix:

```ts
export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.factoryId) {
    redirect('/login');
  }

  const [customers, products, orders] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: true, factoryId: session.factoryId },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where: { isActive: true, factoryId: session.factoryId },
      orderBy: [{ name: 'asc' }, { sizeKg: 'asc' }],
    }),
    prisma.order.findMany({
      where: { factoryId: session.factoryId },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        orderItems: { include: { product: true } },
      },
      take: 50,
    }),
  ]);

  return (
    <DashboardClient
      customers={customers}
      products={products}
      orders={orders}
      currentUser={{
        id: session.userId,
        role: session.role ?? 'STAFF',
        factoryId: session.factoryId,
      }}
      showOnboardingPrompt={session.role === 'ADMIN' && customers.length === 0}
    />
  );
}
```

Other files that need tenant-scope review:

- `src/app/customers/[id]/page.tsx`
- `src/app/config/prices/page.tsx`
- `src/app/api/reports/debt/route.ts`
- `src/app/api/orders/[id]/reconcile/route.ts`
- `src/app/api/orders/bulk-assign/route.ts`
- Pricing override/global price APIs
- Any direct `findUnique`, `findFirst`, `findMany`, `count`, `update`, `delete`, or `upsert` against tenant-owned models.

### 2. Some write APIs are unauthenticated

Several endpoints allow writes without a visible session or role check:

- `src/app/api/prices/global/route.ts`
- `src/app/api/prices/customer/override/route.ts`
- `src/app/api/orders/bulk-assign/route.ts`

Required fix:

- Add shared auth helpers such as `requireSession`, `requireFactoryId`, and `requireRole`.
- Every write endpoint must validate session, role, factory ownership, and subscription status.
- Middleware should not be the only authorization layer for APIs.

### 3. Build and type checks currently fail

Commands run:

```bash
npx tsc --noEmit -p tsconfig.json
npm run build
npm run lint
```

Current failures include:

- `factoryId: string | undefined` passed to Prisma create calls where `factoryId` must be `string`.
- Billing page subscription DTO mismatch.
- Dashboard client receives Prisma `Decimal` where UI expects `number | string`.
- Seed script missing required `factoryId` fields after schema became tenant-scoped.
- `src/components/admin/tenant-table.tsx` defines `SortIcon` inside render, triggering React Compiler lint errors.

Required fix:

- Make `session.factoryId` mandatory before tenant writes.
- Serialize Prisma `Decimal` values before passing to client components.
- Move or replace `SortIcon` with an inline render helper or external component.
- Update seed scripts to create/use a factory and attach `factoryId`.

### 4. Registration always goes to the same URL

Current behavior:

- After signup succeeds, register page always executes `router.push('/dashboard')`.
- This is expected from the code, but not ideal for SaaS onboarding.

Better flow:

- Backend register response should include `nextUrl`.
- New tenant owner should normally go to `/onboarding`.
- Invited staff should go through invite acceptance, then dashboard.
- Unverified email should go to `/verify-email`.
- Billing-required state should go to `/billing`.

Example response:

```ts
return NextResponse.json({
  user,
  subscription,
  nextUrl: '/onboarding',
});
```

Client:

```ts
router.push(data.nextUrl ?? '/dashboard');
```

### 5. Registration is MVP, not production SaaS yet

Good parts:

- Creates tenant, owner, and subscription in one transaction.
- Assigns owner as `ADMIN` and `isFactoryOwner`.
- Creates a 14-day trial.
- Sets session cookie immediately.

Missing SaaS pieces:

- Email verification.
- Rate limiting and anti-abuse protection.
- Stronger password policy.
- Input normalization such as `email.trim().toLowerCase()`.
- Schema validation with `zod` instead of manual checks.
- Workspace or factory slug.
- Onboarding state such as `onboardingCompleted` or `setupStep`.
- Invite-based member registration for staff joining an existing factory.
- Proper unique constraint error handling.

Important distinction:

- Current signup creates a new factory every time.
- It does not support "join existing factory" member registration.

### 6. Subscription enforcement is unreliable

Middleware calls `/api/billing/subscription`, but the API returns:

```ts
{ subscription, driverCount }
```

Middleware currently reads the response as if subscription fields are top-level:

```ts
sub.status
sub.endDate
```

This means expired/cancelled subscription checks may not work as intended.

Required fix:

- Read `data.subscription`.
- Fail closed when the subscription endpoint returns non-OK.
- Prefer checking subscription in the route handler or shared server helper before writes.

### 7. Security hardening needed

Issues:

- `JWT_SECRET` has a hard-coded fallback.
- Some seed scripts print SUPER_ADMIN JWT to console.
- Login/register have no rate limit.
- Driver token access is bearer/query-token based and should be reviewed for expiry/rotation.

Required fix:

- In production, fail startup if `JWT_SECRET` is missing.
- Do not print privileged tokens.
- Add rate limits for auth endpoints.
- Review driver token lifecycle and rotation.

### 8. PrismaClient usage is inconsistent

There is a singleton client in `src/lib/db.ts`, but multiple files instantiate `new PrismaClient()` directly.

Required fix:

- Use one shared Prisma client for normal app operations.
- If a base/unscoped Prisma client is needed for super-admin/internal work, expose it intentionally and name it clearly.
- Avoid scattered `new PrismaClient()` in route handlers.

## Recommended Priority Plan

### Phase 1: Stop tenant leakage

1. Fix `/dashboard` queries to require `session.factoryId`.
2. Audit all tenant-scoped reads/writes.
3. Add explicit `factoryId` filters everywhere.
4. Remove or disable unsafe automatic tenant filtering until it can fail closed.
5. Add tests for tenant A not seeing tenant B data.

### Phase 2: Lock down API writes

1. Create shared auth helpers:
   - `requireSession`
   - `requireFactoryId`
   - `requireRole`
   - `requireActiveSubscription`
2. Apply them to all write endpoints.
3. Fix pricing and bulk-assign endpoints first.

### Phase 3: Make build green

1. Fix TypeScript errors.
2. Fix lint errors in `tenant-table`.
3. Replace deprecated `next lint` script with ESLint CLI.
4. Update seed scripts for tenant-scoped schema.

### Phase 4: Improve SaaS signup

1. Normalize and validate signup input with `zod`.
2. Return `nextUrl` from register API.
3. Redirect new factory owner to `/onboarding`.
4. Add onboarding state to database.
5. Add email verification and auth rate limiting.
6. Add invitation flow for staff/member registration.

### Phase 5: Subscription and billing correctness

1. Fix middleware subscription response parsing.
2. Move subscription enforcement into shared route-level helper.
3. Add tests for trial expired, cancelled, active, and grace-period states.

## Immediate Fix Checklist

- [ ] Fix `src/app/dashboard/page.tsx` to filter customers/products/orders by `session.factoryId`.
- [ ] Fix `src/app/customers/[id]/page.tsx` tenant access.
- [ ] Fix `src/app/config/prices/page.tsx` tenant access.
- [ ] Add auth/role checks to pricing APIs.
- [ ] Add auth/role/factory checks to bulk assign.
- [ ] Fix debt report formula and tenant filter.
- [ ] Fix reconcile route tenant ownership checks.
- [ ] Make `JWT_SECRET` required in production.
- [ ] Add `nextUrl` to register response and redirect new tenants to `/onboarding`.
- [ ] Run `npx tsc --noEmit -p tsconfig.json`.
- [ ] Run `npm run build`.

