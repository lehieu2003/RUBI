---
phase: quick
plan: "260416-nv1"
subsystem: auth
tags: [rbac, auth, middleware]
dependency_graph:
  requires: []
  provides:
    - "src/app/api/auth/login/route.ts: role in login response"
    - "src/lib/auth-provider.tsx: checkAuth called after signIn"
    - "src/middleware.ts: 401 JSON for API routes"
  affects:
    - "src/components/dashboard/sidebar.tsx"
tech_stack:
  added: []
  patterns:
    - "JWT role embedded in token + returned in login response"
    - "checkAuth fetches fresh user data from /api/auth/me"
    - "Middleware returns JSON for API routes, redirects for page routes"
key_files:
  created: []
  modified:
    - path: "src/app/api/auth/login/route.ts"
      lines: "+1"
    - path: "src/lib/auth-provider.tsx"
      lines: "+1, -1"
    - path: "src/middleware.ts"
      lines: "+10"
decisions: []
metrics:
  duration: "~8 hours (paused/resumed)"
  completed: "2026-04-16"
---

# Quick Task 260416-nv1: RBAC Fixs - Login Role Response + API 401 JSON

## Truths Established

- `User.role` is populated after login (not undefined)
- Sidebar hides menu items based on `user.role`
- Unauthorized API calls return 401 JSON, not redirect

## Tasks Completed

### Task 1: Add role to login response
**File:** `src/app/api/auth/login/route.ts`
**Commit:** `61531fe`

Added `role: user.role` to the login response user object at line 60. The JWT already contained the role (lines 45-50), just needed to surface it in the response JSON.

**Verification:** `grep -n "role:" src/app/api/auth/login/route.ts` shows `role: user.role` at line 60.

---

### Task 2: Fix auth-provider to call checkAuth after signIn
**File:** `src/lib/auth-provider.tsx`
**Commit:** `b79b01f`

In the `signIn` function (line 51), replaced `setUser(data.user)` with `await checkAuth()`. This fetches the full user object from `/api/auth/me` which includes the `role` field (selected via Prisma in the me endpoint), ensuring `user.role` is populated after login.

**Verification:** `grep -n "checkAuth" src/lib/auth-provider.tsx` shows `await checkAuth()` at line 51 in signIn.

---

### Task 3: Return 401 JSON for unauthorized API routes
**File:** `src/middleware.ts`
**Commit:** `ddad39d`

Added three `pathname.startsWith('/api/')` checks that return `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`:
1. After unauthenticated redirect block (line 36)
2. In exact pathname match role check (line 52)
3. In parent segment role check (line 66)

**Verification:** `grep -n "pathname.startsWith('/api/')" src/middleware.ts` shows 3 occurrences.

---

## Deviations from Plan

None - all three tasks executed exactly as specified.

## Auth Gates

None.

## Commits

| Hash | Message |
|------|---------|
| `61531fe` | feat(260416-nv1): add role to login response |
| `b79b01f` | feat(260416-nv1): call checkAuth after signIn for fresh role data |
| `ddad39d` | feat(260416-nv1): return 401 JSON for unauthorized API routes |

## Self-Check

- [x] `src/app/api/auth/login/route.ts` contains `role: user.role`
- [x] `src/lib/auth-provider.tsx` calls `checkAuth()` after signIn
- [x] `src/middleware.ts` has 3 API route 401 JSON returns
- [x] All commits exist in git log

## Self-Check: PASSED
