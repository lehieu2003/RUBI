# Phase 6: Data Layer Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 06-data-layer-hardening
**Areas discussed:** Fail-closed behavior, JWT_SECRET validation, Factory.onboardingCompleted, API route redundancy

---

## Fail-closed Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Return empty array | DATA-05 success criteria: findMany→[], findFirst→null, findUnique→null. Silent but safe. | |
| Throw explicit error | Throw Prisma error like 'TenantContext missing factoryId'. Loud failure — better for debugging. | ✓ |
| Log + return empty | Console warn, then return empty. Visibility without breaking. | |

**User's choice:** Throw explicit error
**Notes:** Loud failure is better than silent data leaks. Prefer clear errors over silent wrong behavior.

---

## SUPER_ADMIN Bypass in $extends

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, keep bypass | Super Admin needs system-wide access. Bypass is intentional. | ✓ |
| No - explicit where | SUPER_ADMIN queries should also include factoryId filter. Adds defense but complicates. | |

**User's choice:** Yes, keep bypass (recommended)
**Notes:** Role check happens in middleware before $extends runs — bypass is intentional design.

---

## JWT_SECRET Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Throw at startup | App throws fatal error if JWT_SECRET missing in production. Clear failure. | ✓ |
| Throw in verifyJWT | Only throw when verifyJWT called. App starts but login fails. | |
| NODE_ENV aware | Throw at startup in production, allow missing in dev. | |

**User's choice:** Throw at startup (recommended)
**Notes:** Clear failure — impossible to run without proper config.

---

## Factory.onboardingCompleted Default

| Option | Description | Selected |
|--------|-------------|----------|
| false | New factories start with onboarding incomplete. Forces completion flow. | ✓ |
| true | Default to complete for existing factories, set false during registration for new. | |

**User's choice:** false (recommended)
**Notes:** Forces completion flow for new factories.

---

## API Route Redundancy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep both layers | Explicit filters stay in routes. $extends as safety net, explicit filters make intent clear. | ✓ |
| Remove explicit filters | Rely solely on $extends. Cleaner but one less layer. | |
| Extract shared query helper | Create prisma.withFactoryId() helper. Middle ground. | |

**User's choice:** Keep both layers (recommended)
**Notes:** Defense in depth is worth the redundancy.

---

## Claude's Discretion

- findFirst/findUnique in $extends: same fail-closed behavior as findMany (throw when ctx.factoryId absent)
- Specific error message format for the thrown error
- Migration approach for onboardingCompleted field
