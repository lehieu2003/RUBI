---
phase: 03x-super-admin-extensions
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/app/api/admin/stats/route.ts
  - src/app/admin/dashboard/page.tsx
  - src/app/api/admin/audit-logs/route.ts
  - src/app/api/admin/audit-logs/export/route.ts
  - src/app/admin/audit-logs/page.tsx
  - src/app/api/admin/impersonate/[factoryId]/route.ts
  - src/app/api/admin/impersonate/end/route.ts
  - src/app/api/admin/impersonate/status/route.ts
  - src/app/api/admin/factories/[factoryId]/route.ts
  - src/components/admin/impersonation-drawer.tsx
  - src/app/admin/layout.tsx
  - src/components/admin/tenant-table.tsx
  - src/middleware.ts
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 03x: Code Review Report

**Reviewed:** 2026-04-18
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed 13 files related to the super admin dashboard, impersonation system, audit logs, and tenant management. Found 10 issues across security, logic correctness, and code quality. The most serious issue is that the impersonation token is returned in the API response body, exposing a sensitive credential. There are also several silent failure patterns where errors are swallowed without user notification, and data integrity concerns in the audit log export where historical driver counts do not reflect historical values.

## Critical Issues

### CR-01: Impersonation token exposed in API response body

**File:** `src/app/api/admin/impersonate/[factoryId]/route.ts:40`
**Issue:** The impersonation token is returned in the JSON response body (`token: impersonation.token`), even though it is already set as an httpOnly cookie. This exposes a sensitive security token in server logs, browser devtools, and the response body unnecessarily.
**Fix:**
```typescript
// Remove token from response body - it's already in the httpOnly cookie
const response = NextResponse.json({
  success: true,
  factoryId: factory.id,
  factoryName: factory.name,
  expiresAt: expiresAt.toISOString(),
});
```

## Warnings

### WR-01: Silent API failure with no user notification

**File:** `src/components/admin/tenant-table.tsx:65-86`
**Issue:** In `handleAction`, when the API call returns a non-ok response, the error is silently swallowed. The `onError` callback is never invoked, leaving the user with no feedback that their action (activate, deactivate, extend, price edit) failed.
**Fix:**
```typescript
const handleAction = async (action: string, body?: Record<string, unknown>) => {
  if (!factory.subscription) return;
  setLoading(action);
  try {
    const res = await fetch(`/api/admin/subscriptions/${factory.subscription.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    if (res.ok) {
      const data = await res.json();
      onUpdate({
        ...factory,
        subscription: { ...factory.subscription, ...data.subscription },
      });
    } else {
      // Handle error case - notify user
      const errorData = await res.json().catch(() => ({}));
      onError?.(errorData.error ?? `Action failed (${res.status})`);
    }
  } catch (err) {
    onError?.('Network error - please try again');
  } finally {
    setLoading(null);
    if (action === 'extend') setShowExtend(false);
    if (action === 'price') setShowPriceEdit(false);
  }
};
```

### WR-02: Audit log driver counts are current, not historical

**File:** `src/app/api/admin/audit-logs/route.ts:71-84`
**File:** `src/app/api/admin/audit-logs/export/route.ts:64-77`
**Issue:** Both audit log endpoints query `driver.groupBy` to get the CURRENT active driver count for each factory, then map it to payments. But audit logs are historical records -- the driver count at the time of a payment may differ from the current count. This creates misleading audit data where historical payments show current driver counts.
**Fix:** Either remove the driver count from audit log exports, or store the driver count snapshot in the payment/audit record itself at creation time.

### WR-03: Silent failure on stats fetch in dashboard

**File:** `src/app/admin/dashboard/page.tsx:27-38`
**Issue:** The `fetchStats` callback silently catches all errors in the catch block without notifying the user. If stats fail to load, the user sees "..." indefinitely with no indication something went wrong.
**Fix:**
```typescript
const fetchStats = useCallback(async () => {
  try {
    const res = await fetch('/api/admin/stats');
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    } else {
      handleError('Failed to load statistics');
    }
  } catch {
    handleError('Network error - could not load statistics');
  } finally {
    setStatsLoading(false);
  }
}, []);
```

### WR-04: Silent failure on factories fetch in audit logs page

**File:** `src/app/admin/audit-logs/page.tsx:54-62`
**Issue:** When the factories list fetch fails, it is caught with an empty catch block. The factory dropdown will remain empty and the user receives no feedback.
**Fix:** Add error handling similar to WR-03.

### WR-05: Unused query results in stats API (dead code)

**File:** `src/app/api/admin/stats/route.ts:42-52`
**Issue:** `revenueResult` is computed from `basePrisma.subscription.aggregate()` but never used. The subsequent `basePrisma.subscription.findMany()` is the actual query used. This makes the aggregate call dead code that adds unnecessary database load.
**Fix:** Remove the unused `revenueResult` aggregate query (lines 42-52).

## Info

### IN-01: No minimum value validation on extend days input

**File:** `src/components/admin/tenant-table.tsx:147-151`
**Issue:** The `extendDays` number input has no min validation. A user can enter 0 or negative values, which would result in invalid date calculations.
**Fix:**
```typescript
<input
  type="number"
  value={extendDays}
  onChange={e => setExtendDays(Math.max(1, Number(e.target.value)))}
  min={1}
  placeholder="Số ngày"
  className="w-20 px-2 py-1 text-xs bg-white/5 border border-white/20 rounded text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
/>
```

### IN-02: No auth check for factories API response in audit logs page

**File:** `src/app/admin/audit-logs/page.tsx:54-62`
**Issue:** The fetch to `/api/admin/factories` does not check if the response is ok before parsing JSON. A non-200 response would cause `r.json()` to reject, but this would be caught by the empty catch.
**Fix:** Check `if (!res.ok)` before calling `r.json()`.

### IN-03: Impersonation token endpoint has no rate limiting indicator

**File:** `src/app/api/admin/impersonate/[factoryId]/route.ts`
**Issue:** The impersonation endpoint creates a new impersonation log each time it is called without checking if the admin already has an active impersonation. While the middleware blocks writes during impersonation, a SUPER_ADMIN could inadvertently create multiple active impersonation sessions.
**Fix:** Consider checking for existing active impersonation before creating a new one.

### IN-04: No expiration enforcement on impersonation token server-side

**File:** `src/app/api/admin/impersonate/[factoryId]/route.ts`
**Issue:** While `expiresAt` is computed and sent in the response, the `/api/admin/impersonate/status` endpoint relies on the `startedAt` timestamp + 15-minute window (via `fifteenMinutesAgo`), not the `expiresAt` field. If the token is not ended within 15 minutes, it expires naturally, but there is no explicit `expiresAt` check in the status query.
**Fix:** Consider adding an explicit `expiresAt` field check to the `impersonationLog.findFirst` query in the status endpoint for clarity and future flexibility.

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
