# Phase 10: Build Correctness - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix TypeScript compilation errors so `npx tsc --noEmit -p tsconfig.json` passes with zero errors; fix `npm run build` so it completes successfully; serialize Prisma Decimal fields to string before passing to client components; update seed scripts to use factoryId on all tenant-scoped entities. BUILD-05 (SortIcon) already fixed in Phase 9.

</domain>

<decisions>
## Implementation Decisions

### TypeScript Error: dashboard/page.tsx role type mismatch
- **D-01:** Change `DashboardClientProps.currentUser` type in `src/components/dashboard/dashboard-client.tsx` line 26 to accept `role: string | undefined` (factoryId is already `string | null`)
- **D-02:** Fix `src/app/dashboard/page.tsx` line 65 to pass `{ id, role: session.role, factoryId }` matching the corrected interface — since the component guards with `currentUser?.role === 'ADMIN'`, undefined role is handled safely
- **Rationale:** Minimal blast radius — only affects this one component interface. Component already guards against undefined role. Fixing JWTPayload interface would require checking 128 files that reference session.role.

### TypeScript Error: dashboard-client.tsx Decimal vs string|number
- **D-03:** Serialize `Order.total` (Prisma Decimal) to string or number before passing to DashboardClient — use `.toString()` or `Number(decimal)` in the server component that fetches orders, before passing to the client component
- **D-04:** Audit other components that receive Prisma Decimal fields (Order.total, GlobalPrice.pricePerUnit, CustomerPriceOverride.pricePerUnit, OrderItem fields) — serialize at the server component boundary, not in client components

### TypeScript Error: seed.ts missing factoryId
- **D-05:** Create a system factory with `isSystem: true` as a seed prerequisite before creating Products, Customers, and Orders
- **D-06:** Attach `factoryId` to all tenant-scoped entities in seed.ts: Product, Customer, Order (and OrderItem through the relation)
- **Rationale:** Consistent with how the system factory works in production — all pre-existing records are owned by the system factory

### Decimal Serialization Strategy
- **D-07:** Serialize at the RSC (server component) boundary — where data is fetched and before passing to client components
- **D-08:** Do NOT serialize inside Prisma queries — keep raw Decimal values in database layer, convert at the component boundary
- **Rationale:** Maintains type safety at the DB layer while ensuring client components receive JSON-serializable values

### Claude's Discretion
- Exact location in each file where Decimal serialization happens (can infer from error messages and component props)
- ESLint warnings cleanup (unused imports, console statements) — these don't block build but should be addressed

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §Phase 10 — Phase goal, success criteria, BUILD-01/02/03/04/05
- `.planning/REQUIREMENTS.md` §BUILD-01, §BUILD-02, §BUILD-03, §BUILD-04, §BUILD-05

### TypeScript Errors
- `src/app/dashboard/page.tsx:65` — role type mismatch (session.role is string | undefined)
- `src/components/dashboard/dashboard-client.tsx:218` — Decimal not assignable to string|number
- `src/db/seed.ts:112,133,333` — missing factoryId on Product/Customer/Order creates

### Prior Phase Context
- `.planning/phases/09-super-admin-integration/09-CONTEXT.md` — Phase 9 context (BUILD-05 SortIcon already fixed)
- `.planning/phases/08-api-route-hardening/08-CONTEXT.md` — Auth helpers, subscription enforcement patterns
- `.planning/phases/06-data-layer-hardening/06-CONTEXT.md` — factoryId scoping decisions

### Key Files
- `src/lib/auth.ts` — JWTPayload interface (role?: string)
- `src/app/dashboard/page.tsx` — RSC that fetches data and passes to DashboardClient
- `src/components/dashboard/dashboard-client.tsx` — DashboardClientProps interface
- `src/db/seed.ts` — Seed script needing factoryId
- `prisma/schema.prisma` — All tenant entities (Product, Customer, Order) have factoryId field

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- System factory pattern already exists in production data model (isSystem flag)
- Phase 9 already fixed SortIcon (BUILD-05) — SortIcon is now at module level in tenant-table.tsx

### Established Patterns
- Decimal serialization: Already happening in some places via `Number(decimal)` or `.toString()`
- factoryId on all tenant entities was established in Phase 6

### Integration Points
- Dashboard RSC (page.tsx) → DashboardClient component — this is where Decimal serialization should happen
- Seed script → needs system factory as prerequisite entity

</codebase_context>

<specifics>
## Specific Ideas

- BUILD-05 (SortIcon) was already fixed in Phase 9 — do NOT re-do this work
- ESLint warnings (unused imports, console.log) are separate from TypeScript errors — can be addressed separately or left as warnings

</specifics>

<deferred>
## Deferred Ideas

- ESLint warnings cleanup (unused imports, console statements) — not blocking build, separate from BUILD requirements
- INT-02 (per-customer pricing) — gap found in Phase 9 verification, different phase scope

</deferred>

---

*Phase: 10-build-correctness*
*Context gathered: 2026-04-23*
