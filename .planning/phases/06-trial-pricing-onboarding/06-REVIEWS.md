---
phase: 06-trial-pricing-onboarding
reviewers: [codex]
reviewed_at: 2026-04-17T00:00:00Z
plans_reviewed: [06-01a-PLAN.md, 06-01b-PLAN.md, 06-02-PLAN.md, 06-03-PLAN.md, 06-04-PLAN.md]
---

# Cross-AI Plan Review — Phase 06

> Note: Only codex CLI was available for review (claude skipped — running inside Claude Code).

## Codex Review

## 06-01a-PLAN.md (Backend Foundation)

### 1) Summary
Strong foundation direction (separate `Subscription` model + helper layer), but it has a critical integrity gap: registration is not truly atomic yet. Without tight DB constraints and transactional guarantees, this phase can create partial accounts and inconsistent trial states.

### 2) Strengths
- Separates billing lifecycle from user identity (`Subscription` not on `User`), which is the right long-term model.
- Defines clear subscription enums (`planType`, `status`) aligned with decisions D-02/D-04.
- Introduces shared helper functions early, reducing duplicated logic in later waves.
- Calls out the transaction issue explicitly in verification notes.

### 3) Concerns
- **HIGH**: Registration still uses 3 separate DB operations; partial writes can occur on failure.
- **HIGH**: Missing explicit unique constraints/indexes (phone, factory linkage, active subscription lookup).
- **MEDIUM**: `factoryId` ownership/creation flow is unclear (who creates factory record, when, and with what rollback behavior).
- **MEDIUM**: `xlsx`/`papaparse` installation in this wave adds dependency surface before import/export is implemented.
- **MEDIUM**: No explicit timezone/date boundary policy for trial start/end and warning windows.

### 4) Suggestions
- Enforce single `prisma.$transaction` for user + factory + subscription creation.
- Add DB constraints now: normalized unique phone, foreign keys, and index on `(factoryId, status, endDate)`.
- Define a formal subscription state transition map (`TRIAL_ACTIVE -> EXPIRED`, `PAID_ACTIVE -> CANCELLED`, etc.).
- Use migration files (not just schema push) with rollback strategy.
- Move `xlsx`/`papaparse` to the wave where they are actually used unless needed immediately.

### 5) Risk Assessment
**MEDIUM** — architecture is good, but transactional and schema-rigor gaps can cause data corruption early.

---

## 06-01b-PLAN.md (Frontend UI)

### 1) Summary
The UI plan maps well to trial visibility goals (banner + warning modal), but enforcement is too frontend/middleware-centric. Without server-side write protection at API level, expired accounts can still mutate data through direct calls.

### 2) Strengths
- Field ordering supports fast onboarding and aligns with "phone + factory first".
- Persistent trial banner supports D-05 and keeps upgrade CTA visible.
- Admin-only warning modal aligns with D-06 and avoids distracting non-admin users.
- Middleware extension attempts centralized gating.

### 3) Concerns
- **HIGH**: "Block writes in middleware" alone is insufficient; APIs also need subscription checks.
- **MEDIUM**: Non-dismissible modal can become a UX dead-end if support/upgrade path fails.
- **MEDIUM**: Route-level blocking may miss edge write paths (RPC endpoints, background actions, upload endpoints).
- **LOW**: Banner on "all pages" may interfere with print-focused pages if not explicitly excluded.

### 4) Suggestions
- Add mandatory server-side authorization guard for all write APIs (`POST/PUT/PATCH/DELETE`).
- Provide deterministic fallback actions in warning modal (`Liên hợp trợ`, `Nâng cấp`, `Đăng xuất`).
- Add route exemption list for auth, billing, support, and export flows.
- Define print-safe layout behavior so banner/modal never breaks thermal printing flows.

### 5) Risk Assessment
**MEDIUM** — strong UX intent, but enforcement must move deeper than frontend middleware.

---

## 06-02-PLAN.md (Pricing Dashboard)

### 1) Summary
Feature-complete plan for pricing/onboarding, but security and billing correctness risks are high. The current payment confirmation approach can be abused, and driver billing math appears inconsistent with pricing decisions.

### 2) Strengths
- Covers key phase outcomes: pricing view, VietQR content, onboarding import flow.
- VietQR content format is concrete and locally relevant (Vietnam transfer behavior).
- Includes customer import with mapping/preview flow, which reduces onboarding friction.
- Billing dashboard consolidates key subscription signals in one place.

### 3) Concerns
- **HIGH**: `POST /api/payments/confirm` extending +30 days is unsafe without strict verification/authorization/audit.
- **HIGH**: Pricing math ambiguity: plan says charge per active driver, but UI mentions `driverCount - 1`; may under/overcharge.
- **MEDIUM**: "+30 days" is not equivalent to monthly billing cycles; date drift accumulates.
- **MEDIUM**: Import API edge cases not explicit (duplicate phone formats, partial failures, rollback behavior).
- **MEDIUM**: CSV handling can introduce formula-injection/security issues on later exports.
- **LOW**: Large imports may block request thread if not chunked/backgrounded.

### 4) Suggestions
- Gate payment confirmation to admin roles only; require payment evidence and audit trail.
- Introduce invoice objects with period start/end instead of naïve `+30 days`.
- Resolve driver counting contract: one canonical definition used by backend and UI.
- Add import validation strategy: normalization, dedupe keys, error report CSV, and transactional chunking.
- Add idempotency keys for payment and import endpoints.

### 5) Risk Assessment
**HIGH** — biggest risk area due to payment integrity and billing logic inconsistencies.

---

## 06-03-PLAN.md (Cancel Flow)

### 1) Summary
Good alignment with cancellation/export goals and retention offer, but there are major data-protection and state-management risks. Export and cancellation sequencing must be atomic and authorization-safe.

### 2) Strengths
- Matches D-12/D-13/D-14 clearly (cancel options + two-sheet export + grace handling).
- Explicitly plans grace-period enforcement and account lock behavior.
- Integrates cancel flow into billing where admins expect it.

### 3) Concerns
- **HIGH**: Export API/data scope not explicitly permission-scoped; risk of cross-factory data leakage.
- **HIGH**: Cancel/update endpoints can be abused if role checks and tenant scoping are weak.
- **MEDIUM**: Setting `endDate = now + 7d` on cancel may overwrite meaningful billing/trial dates needed for reporting.
- **MEDIUM**: Export generation may timeout for large order history if synchronous.
- **MEDIUM**: `PATCH /api/subscriptions/[id]` for driver count can become billing-tampering vector.

### 4) Suggestions
- Enforce strict tenant + admin authorization on all subscription/export endpoints.
- Make cancel + export flow transactional with audit logs and immutable cancellation timestamp.
- Preserve original billing/trial end fields; store grace window separately (`graceEndsAt`).
- Generate export asynchronously for large datasets; provide signed download link.
- Restrict driver count updates to server-derived values from active driver records (not client input).

### 5) Risk Assessment
**HIGH** — sensitive operations (billing state + full data export) need tighter controls.

---

## 06-04-PLAN.md (Integration)

### 1) Summary
Integration plan is directionally correct (central auth context + AppShell + onboarding prompt), but there is overlap and potential duplication with earlier waves. It needs a clear single source of truth for subscription state and warning triggers.

### 2) Strengths
- Extending `/api/auth/me` to include subscription metadata simplifies frontend gating.
- AppShell centralization is good for consistent banner/warning behavior.
- Onboarding prompt tied to `customerCount === 0` supports activation goals.

### 3) Concerns
- **MEDIUM**: Trial warning modal appears planned in both 06-01b and 06-04; duplication risk.
- **MEDIUM**: `/api/auth/me` could become overloaded if polled too often without caching strategy.
- **MEDIUM**: If `customerCount` is queried per load, dashboard performance may degrade at scale.
- **LOW**: Potential mismatch between middleware gating and client-side auth state timing (flash of wrong UI).

### 4) Suggestions
- Define one canonical subscription source (`/api/auth/me` + shared guard middleware + API guard).
- Merge modal ownership into one layer (either login route or app bootstrap), not both.
- Cache/subscription refresh policy (stale-while-revalidate or timed re-fetch) to reduce load.
- Add integration tests for end-to-end state transitions: trial -> warning -> expired -> paid -> cancelled -> locked.

### 5) Risk Assessment
**MEDIUM** — mostly coordination/integration risk, less core-model risk.

---

## Consensus Summary

### Agreed Strengths
- Subscription model separation from User is architecturally correct
- VietQR format is concrete and locally relevant
- Trial banner and warning modal UX aligns with decisions D-05, D-06
- Helper functions introduced early reduce duplication
- Cancel flow with retention offer matches D-14

### Agreed Concerns (Highest Priority)
1. **HIGH — API-level enforcement incomplete**: Middleware-only blocking is bypassable via direct API calls; all write APIs need subscription checks
2. **HIGH — Payment confirmation unsafe**: `POST /api/payments/confirm` extending +30 days without verification/audit trail is a financial risk
3. **HIGH — Registration non-atomic**: Three separate DB ops can leave orphaned users if subscription.create fails
4. **MEDIUM — Driver counting inconsistency**: Plan says active drivers, UI uses `driverCount - 1` — may not align
5. **MEDIUM — endDate overloading**: `endDate` used for trial end, grace period end, and billing extension — semantic confusion

### Divergent Views
- Codex flagged "banner may interfere with print pages" — this was not flagged in verification
- Payment confirmation risk (HIGH per Codex) — verification noted the endpoint exists but didn't flag as security concern
- Date drift from "+30 days" — architectural concern not raised in verification
