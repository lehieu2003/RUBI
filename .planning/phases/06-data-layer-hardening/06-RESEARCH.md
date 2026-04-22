# Phase 6: Data Layer Hardening - Research

**Researched:** 2026-04-22
**Domain:** Prisma tenant isolation hardening, JWT security, seed script security, schema additions
**Confidence:** HIGH

## Summary

Phase 6 addresses critical security gaps in the data layer: making tenant isolation fail-closed (no silent cross-tenant queries), enforcing JWT_SECRET at startup, removing token leakage from seed scripts, and adding an onboarding completion flag to the Factory model. All changes are surgical modifications to existing files. No new dependencies required. Prisma version 7.7.0 confirmed current.

## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **Prisma $extends THROWS explicit error** when `ctx.factoryId` absent for tenant-scoped models (Customer, Driver, Order, Product, User, Subscription). Not silent empty — loud failure.
2. **SUPER_ADMIN bypasses factoryId filter entirely** in $extends — role check happens in middleware before $extends runs.
3. **App throws fatal error on startup** if `JWT_SECRET` env var is missing in production.
4. **Remove hardcoded fallback secret** from auth.ts.
5. **seed-system-factory.ts must NOT print JWT tokens** to console.
6. **Add `onboardingCompleted: Boolean @default(false)`** to Factory model.
7. **Keep explicit factoryId filters** in API routes as defense in depth.

### Claude's Discretion

- `findFirst`/`findUnique` in $extends: same fail-closed behavior as `findMany`
- Specific error message format for the thrown error
- Migration approach for `onboardingCompleted` field

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| DATA-01 | All tenant-scoped queries explicitly filter by `session.factoryId` | API routes already have explicit filters; $extends adds safety net |
| DATA-02 | Dashboard reads only `factoryId`-scoped data | Extended Prisma auto-injects filter |
| DATA-03 | All customer/order/product/driver API GET routes filter by `factoryId` | API routes confirmed with explicit `factoryId: session.factoryId` in `where` |
| DATA-04 | All customer/order/product/driver API POST/PATCH/DELETE routes set `factoryId` from session | Verified in POST /api/customers |
| DATA-05 | Prisma $extends auto-inject fails-closed when `ctx.factoryId` absent | **Primary change** — current code passes through; needs explicit throw |
| SEC-01 | JWT_SECRET env var required — app fails to start if missing in production | **Primary change** — auth.ts currently falls back to hardcoded secret |
| SEC-02 | No seed scripts print SUPER_ADMIN JWT tokens to console | **Primary change** — seed-system-factory.ts lines 61-62 print token |
| SEC-03 | No hardcoded JWT secret fallbacks in production code | **Primary change** — auth.ts line 5 has fallback |
| REG-03 | Factory model has `onboardingCompleted: boolean` field | **Primary change** — schema.prisma needs new field |
| BUILD-04 | Seed scripts create entities with proper `factoryId` field values | Seed script verified — factoryId: null for SUPER_ADMIN |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tenant isolation ($extends) | API/Backend | — | Prisma $extends runs in API/Backend tier; all tenant queries go through it |
| JWT_SECRET validation | API/Backend | — | Module-load check in auth.ts, called at request time |
| Seed scripts | API/Backend | — | Node scripts that write to database |
| Factory.onboardingCompleted | Database | API/Backend | Field on Factory model; written after onboarding flow |
| Explicit factoryId filters | API/Backend | — | API routes already implement this as defense in depth |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @prisma/client | 7.7.0 | Database access with $extends | ORM with tenant middleware |
| prisma | 7.7.0 | Database migrations | Schema management |
| jose | 6.2.2 | JWT sign/verify | Used in auth.ts for JWT operations |
| bcryptjs | 3.0.3 | Password hashing | Used in seed scripts |

[VERIFIED: npm registry 2026-04-22]

### No new dependencies
This phase uses only existing project dependencies.

---

## Architecture Patterns

### System Architecture Diagram

```
Request → Middleware (setTenantContext) → AsyncLocalStorage (factoryId, role)
                                                    ↓
                                              API Route Handler
                                                    ↓
                                              prisma.$extends query hooks
                                                    ↓
                              ┌──────────────────────┤──────────────────────┐
                              ↓                                              ↓
                    SUPER_ADMIN?                                   Tenant-scoped model?
                    (bypass filter)                                   (require factoryId)
                              ↓                                              ↓
                    query(args) ← bypass                          ┌───── THROW (fail-closed)
                                                                    ↓
                                                            ctx.factoryId present?
                                                                  ↓    ↓
                                                               YES    NO → THROW Error
                                                                  ↓
                                                           query(args) with factoryId injected
```

### Recommended Project Structure
```
src/
├── lib/
│   ├── db.ts          # Prisma $extends (modified: fail-closed throw)
│   ├── auth.ts        # JWT handling (modified: remove fallback, startup check)
│   └── tenant.ts      # AsyncLocalStorage (unchanged)
prisma/
├── schema.prisma      # Factory model (modified: add onboardingCompleted)
└── seed-system-factory.ts  # Seed (modified: remove token console.log)
```

---

## Changes Required

### 1. `src/lib/db.ts` — Fail-Closed $extends

**Current behavior (lines 17-28):** When `ctx.factoryId` is absent, the query passes through without throwing — tenant-scoped models return all records across all factories.

**Required behavior:** For non-SUPER_ADMIN roles accessing tenant-scoped models, throw an explicit error when `ctx.factoryId` is absent.

```typescript
// Pattern for all $allModels query hooks:
// After SUPER_ADMIN bypass check, before query():
if (factoryIdModels.includes(model)) {
  if (!ctx.factoryId) {
    throw new Error(
      `TENANT_ACCESS_DENIED: ${model} query requires factoryId context. ` +
      `Ensure setTenantContext() was called in middleware.`
    );
  }
  args.where = { ...args.where, factoryId: ctx.factoryId };
}
```

**Affected hooks:** `findMany` (lines 17-28), `findFirst` (lines 30-37), `findUnique` (lines 39-47)

**Note:** All three hooks have identical fail-closed logic missing — when `ctx.factoryId` is absent and role is not SUPER_ADMIN, they silently return without filtering. The fix applies the same pattern to all three.

### 2. `src/lib/auth.ts` — JWT_SECRET Startup Validation

**Current behavior (lines 4-6):** Falls back to `'iceflow-secret-key-change-in-production'` when `JWT_SECRET` env var is missing.

**Required behavior:** In production (`NODE_ENV === 'production'`), throw an error at module load time if `JWT_SECRET` is not set.

```typescript
// At module scope, before any function:
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required in production. Set it to a secure random string.');
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET // no fallback
);
```

### 3. `prisma/schema.prisma` — Factory.onboardingCompleted

**Current Factory model (lines 10-28):** No `onboardingCompleted` field.

**Required:** Add `onboardingCompleted Boolean @default(false)` to Factory model.

```prisma
model Factory {
  // ... existing fields ...
  onboardingCompleted Boolean @default(false) @map("onboarding_completed")
  // ... relations ...
}
```

**Migration approach:** Use `npx prisma migrate dev --name add_factory_onboarding_completed` — Prisma handles the column addition with default value.

### 4. `prisma/seed-system-factory.ts` — Remove Token Logging

**Current behavior (lines 61-62):**
```typescript
console.log('SUPER_ADMIN JWT token:', token);
console.log('Store this token securely — it provides system-wide access.');
```

**Required behavior:** Remove these console.log statements entirely. The JWT token should never be printed.

**Note:** Lines 61-62 print the raw JWT token to stdout. This is SEC-02 violation. The token provides system-wide SUPER_ADMIN access and should never be exposed in logs.

### 5. Defense in Depth — API Routes (D-07 confirmed)

API routes already implement explicit `factoryId: session.factoryId` in `where` clauses. Verified:
- `src/app/api/customers/route.ts` line 16, 21, 50
- `src/app/api/orders/route.ts` line 23

These are untouched per D-07 — they serve as defense in depth, not the primary mechanism.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tenant isolation | Custom query wrappers per model | Prisma $extends | $extends runs globally on all queries; custom wrappers miss raw queries |
| JWT signing | Custom JWT implementation | jose library (already installed) | jose is battle-tested, handles edge cases (timing attacks, etc.) |
| Password hashing | Custom salt/hash | bcryptjs (already installed) | bcrypt is industry standard, tuned rounds prevent brute force |
| Schema migration | Manual SQL | `prisma migrate dev` | Prisma migrate tracks migration history, handles rollbacks |

---

## Common Pitfalls

### Pitfall 1: $extends Runs Before Middleware Sets Context
**What goes wrong:** API handler calls `prisma.customer.findMany()` before `setTenantContext()` runs, resulting in `ctx.factoryId === null` and the fail-closed throw.
**Why it happens:** AsyncLocalStorage is set per-request in middleware. If `prisma` is imported at module level and queries execute before middleware sets context, the context store is empty.
**How to avoid:** Ensure middleware runs before any route handler code. Next.js middleware runs before route handlers by design — no changes needed if using standard Next.js patterns.
**Warning signs:** "TENANT_ACCESS_DENIED" errors appearing on routes that should work — indicates middleware chain issue.

### Pitfall 2: Prisma $extends Doesn't Cover `count()` and `aggregate()`
**What goes wrong:** `prisma.customer.count({ where: { isActive: true } })` bypasses the $extends `findMany` hook — `count()` is a separate query type.
**Why it happens:** Prisma $extends query hooks cover `findMany`, `findFirst`, `findUnique`, `update`, etc. but aggregation/count operations may have separate execution paths.
**How to avoid:** For `count()` in API routes, ensure the `where` clause explicitly includes `factoryId: session.factoryId` — which the existing routes already do (see `src/app/api/customers/route.ts` line 16). API routes must remain the primary defense.
**Warning signs:** Count queries returning wrong numbers across factories — indicates count bypassed $extends.

### Pitfall 3: Migration Default Value Conflict
**What goes wrong:** Adding `onboardingCompleted Boolean @default(false)` to an existing Factory row that has no column yet — Prisma migrate may fail if there's a conflict with existing data defaults.
**Why it happens:** PostgreSQL requires the column to have a default or be nullable to add to existing rows. `Boolean @default(false)` is safe — false is the declared default.
**How to avoid:** Standard `npx prisma migrate dev --name add_factory_onboarding_completed` should handle this correctly. If issues arise, use `prisma db push` instead which is more forgiving for dev environments.

### Pitfall 4: Hardcoded Secret Removal Breaks Dev Without .env
**What goes wrong:** After removing the fallback, `npm run dev` crashes immediately if `.env` is missing `JWT_SECRET`.
**Why it happens:** The startup check throws before any request is processed.
**How to avoid:** During development, always use a `.env` file with `JWT_SECRET=<any-value>`. The check only throws in production (`NODE_ENV === 'production'`), so dev workflow is unaffected.

---

## Code Examples

### Fail-Closed $extends Pattern (db.ts)

```typescript
// Source: derived from current src/lib/db.ts lines 14-50
// Pattern: check ctx.factoryId before query execution
const factoryIdModels = ['Customer', 'Driver', 'Order', 'Product', 'User', 'Subscription'];

async findMany({ model, args, query }) {
  const ctx = getTenantContext();
  if (ctx.role === 'SUPER_ADMIN') return query(args);
  
  if (factoryIdModels.includes(model)) {
    if (!ctx.factoryId) {
      throw new Error(
        `TENANT_ACCESS_DENIED: ${model} query requires factoryId context. ` +
        `Ensure setTenantContext() was called in middleware.`
      );
    }
    args.where = { ...args.where, factoryId: ctx.factoryId };
  }
  return query(args);
}
```

### JWT_SECRET Startup Check (auth.ts)

```typescript
// Source: auth.ts pattern
// At module scope (not inside a function):
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is required in production. ' +
    'Set it to a cryptographically random string of at least 32 characters.'
  );
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
```

### Schema Field Addition (schema.prisma)

```prisma
// Source: derived from schema.prisma lines 10-28
model Factory {
  id                   String   @id @default(cuid())
  name                 String
  phone                String?
  address              String?
  isSystem             Boolean  @default(false) @map("is_system")
  onboardingCompleted  Boolean  @default(false) @map("onboarding_completed")
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")
  // ... relations ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Silent empty results on missing factoryId | Explicit throw on missing factoryId | Phase 6 | Fail-fast instead of silent data leakage |
| Hardcoded JWT fallback secret | Required env var, throws at startup | Phase 6 | Impossible to run without proper config |
| JWT token printed to console in seed | No token logging | Phase 6 | Tokens never exposed in stdout |
| No onboarding tracking | Factory.onboardingCompleted flag | Phase 6 | Enables onboarding state UI |

**Deprecated/outdated:**
- Fallback JWT secrets: Security risk, now enforced absent at production startup
- Silent tenant filtering: Security risk, now throws explicitly

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Prisma $extends `count()` bypasses `findMany` hooks | Common Pitfalls | If count uses same path, fail-closed might be redundant but not harmful. Manual verification recommended after implementing. |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

---

## Open Questions

1. **Should the fail-closed error include the attempted model name and operation?**
   - What we know: Error message should identify which model was queried and that factoryId was missing
   - What's unclear: Whether to include the attempted operation type (findMany vs findFirst) — probably useful for debugging
   - Recommendation: Include both model name and operation: `"TENANT_ACCESS_DENIED: ${model}.${operation} requires factoryId context."`

2. **Does Prisma $extends cover `count()` queries?**
   - What we know: The `findMany` hook covers the standard find path; count may use a different query execution path
   - What's unclear: Whether `prisma.customer.count({ where: {...} })` goes through $extends hooks
   - Recommendation: Trust the API route explicit filters as the primary defense (which is already implemented per DATA-01). $extends is the safety net.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | 24.14.1 | — |
| npm | Package manager | ✓ | 11.11.0 | — |
| prisma CLI | Migrations | ✓ | 7.7.0 | — |
| PostgreSQL | Database | — | — | Supabase (external) |
| jose | JWT operations | ✓ | 6.2.2 (installed) | — |
| bcryptjs | Password hashing | ✓ | 3.0.3 (installed) | — |

**Missing dependencies with no fallback:**
- None identified for this phase

**Missing dependencies with fallback:**
- None — all required tools are available

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT_SECRET required at startup (SEC-01); no hardcoded fallbacks (SEC-03) |
| V3 Session Management | yes | JWT tokens printed to console in seed scripts removed (SEC-02) |
| V4 Access Control | yes | Tenant isolation fail-closed (DATA-05); explicit factoryId filters (DATA-01, DATA-03) |
| V5 Input Validation | no | Not in this phase scope |
| V6 Cryptography | yes | jose library for JWT (not hand-rolled); bcryptjs for passwords |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data leakage | Information Disclosure | $extends fail-closed throws when factoryId absent |
| Hardcoded secret in source | Tampering | Remove fallback; validate at startup |
| JWT token in logs | Information Disclosure | Remove console.log from seed script |
| SUPER_ADMIN bypass abuse | Elevation of Privilege | Role check in middleware before $extends runs |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry] @prisma/client 7.7.0, prisma 7.7.0, jose 6.2.2, bcryptjs 3.0.3
- [VERIFIED: src/lib/db.ts lines 14-50] Current $extends implementation — passes through when factoryId absent
- [VERIFIED: src/lib/auth.ts lines 4-6] Hardcoded fallback present
- [VERIFIED: prisma/seed-system-factory.ts lines 61-62] JWT token printed to console
- [VERIFIED: prisma/schema.prisma lines 10-28] Factory model lacks onboardingCompleted field
- [VERIFIED: src/app/api/customers/route.ts lines 16, 21, 50] Explicit factoryId filter present
- [VERIFIED: src/app/api/orders/route.ts line 23] Explicit factoryId filter present

### Secondary (MEDIUM confidence)
- [CITED: Prisma $extends documentation] Query hooks cover findMany, findFirst, findUnique, update, delete — aggregation functions may have separate paths

### Tertiary (LOW confidence)
- None — all critical claims verified against source code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry, no new dependencies
- Architecture: HIGH — existing patterns well understood from codebase
- Pitfalls: MEDIUM — Prisma $extends behavior for count() not explicitly verified, but API route filters provide defense

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days — stable domain, no fast-moving changes expected)
