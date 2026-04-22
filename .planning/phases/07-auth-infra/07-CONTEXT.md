# Phase 7: Auth Infrastructure + Registration - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

All auth endpoints use consistent helpers; registration validates input with Zod, normalizes email, enforces password strength, rate limits by IP. Auth helpers work across API Route Handlers and Server Actions. requireSession/requireRole/requireActiveSubscription available as shared helpers.
</domain>

<decisions>
## Implementation Decisions

### Auth Helper Structure (AUTH-01, AUTH-03, AUTH-04, AUTH-05, AUTH-06)
- **D-01:** Auth helpers live in a single shared file at `src/lib/auth/helpers.ts` — imported everywhere for consistency.
- **D-02:** `requireSession()` — returns session payload or throws `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`
- **D-03:** `requireRole(roles[])` — checks session.role against allowed roles or throws `NextResponse.json({ error: 'Forbidden' }, { status: 403 })`
- **D-04:** `requireActiveSubscription()` — verifies subscription is ACTIVE/PAID or throws `NextResponse.json({ error: 'Subscription Required' }, { status: 403 })`
- **D-05:** `requireFactoryId()` — extracts factoryId from session or throws 400 Bad Request
- **D-06:** Auth helpers work in both API Route Handlers (`src/app/api/**/*.ts`) and Server Actions (`src/app/**/actions.ts`)

### Rate Limiting Strategy (RATEL-01, RATEL-02, RATEL-03)
- **D-07:** In-memory Map-based rate limiter (no new dependency) at `src/lib/rate-limit.ts`
- **D-08:** Keyed by IP address only — simple, handles office IP sharing where multiple staff share one IP
- **D-09:** Registration: max 3 requests per IP per minute → 429 with `Retry-After` header
- **D-10:** Login: max 5 requests per IP per minute → 429 with `Retry-After` header

### Input Validation (VALI-01, VALI-02, VALI-03, VALI-04, VALI-05)
- **D-11:** Zod v4 schemas defined in `src/lib/schemas/` for registration and login
- **D-12:** Registration schema: name, phone, managerName, email, password — all validated with Zod
- **D-13:** Email normalized: `trim().toLowerCase()` before storage (VALI-02)
- **D-14:** Password minimum 8 characters (VALI-03)
- **D-15:** All invalid input returns 400 with Zod error structure `{ errors: [...] }` (VALI-05)

### Registration Response (REG-01, REG-02)
- **D-16:** Registration API returns `nextUrl` in response body: `NextResponse.json({ ..., nextUrl: '/onboarding' })`
- **D-17:** Client reads `nextUrl` from response and redirects — not hardcoded on client

### Onboarding Completion (REG-03, REG-04, REG-05)
- **D-18:** After CSV import succeeds, separate PATCH call to mark onboarding complete
- **D-19:** Dashboard shows onboarding prompt for ADMIN users when `factory.onboardingCompleted === false`
- **D-20:** Factory model already has `onboardingCompleted: Boolean @default(false)` from Phase 6

### Registration Flow (FACT-01, FACT-02)
- **D-21:** Registration creates Factory + User (ADMIN, isFactoryOwner=true) + Subscription (TRIAL, 14 days) atomically via `$transaction`
- **D-22:** Registration atomically sets `factoryId` on User and `factoryId` on Subscription

### Claude's Discretion
- Specific file structure for helpers.ts — Claude decides internal organization
- Rate limit cleanup interval (how often to prune expired entries)
- Exact Zod error message wording — Claude decides
- Migration approach if needed for onboarding flow changes
</decisions>

<canonical_refs>
## Canonical References

### Phase Requirements
- `ROADMAP.md` §Phase 7 — Phase goal, success criteria, requirements mapping
- `REQUIREMENTS.md` §AUTH-01 to AUTH-06, §VALI-01 to VALI-05, §RATEL-01 to RATEL-03, §REG-01 to REG-05, §FACT-01 to FACT-02, §SUB-01

### Prior Phase Context
- `.planning/phases/06-data-layer-hardening/06-CONTEXT.md` — Phase 6 decisions (fail-closed, JWT_SECRET, onboardingCompleted field)

### Existing Implementation
- `src/lib/auth.ts` — JWT sign/verify/getSession (already has JWT_SECRET validation in prod)
- `src/lib/db.ts` — Prisma client with $extends (tenant middleware already in place)
- `src/app/api/auth/register/route.ts` — Registration endpoint (CURRENT: manual validation, no Zod, no rate limit, no nextUrl)
- `src/app/api/auth/login/route.ts` — Login endpoint (CURRENT: no rate limit)
- `src/app/onboarding/page.tsx` — Onboarding CSV import UI (already exists)
- `prisma/schema.prisma` — Factory model already has `onboardingCompleted` field (added in Phase 6)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/auth.ts` — JWT helpers (signJWT, verifyJWT, getSession, setSessionCookie, clearSessionCookie) — extend with auth helpers
- `src/lib/db.ts` — Prisma instance with tenant $extends — auth helpers use this to check subscription
- Existing registration flow at `src/app/api/auth/register/route.ts` — needs Zod, rate limit, nextUrl, email normalization

### Established Patterns
- JWT payload: `{ userId, email, name, role, factoryId }`
- Cookie-based auth: `httpOnly`, `secure` in prod, `sameSite: 'lax'`
- Atomic factory+user+subscription creation in `$transaction`
- SUPER_ADMIN bypass via role check before factoryId injection

### Integration Points
- Auth helpers at `src/lib/auth/helpers.ts` — imported by all API routes
- Rate limiter at `src/lib/rate-limit.ts` — imported by login + register routes
- Onboarding prompt in dashboard — check `factory.onboardingCompleted` for ADMIN role
- Onboarding CSV import already POSTs to `/api/customers/import` — needs PATCH `/api/factory/onboarding` after success
</code_context>

<specifics>
## Specific Ideas

No specific "I want it like X" moments — implementation follows from requirements and prior phase decisions.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-auth-infra*
*Context gathered: 2026-04-22*
