---
phase: "06"
plan: "01b"
type: execute
wave: 2
depends_on: ["06-01a"]
files_modified:
  - src/app/(auth)/register/page.tsx
  - src/components/trial/TrialBanner.tsx
  - src/components/trial/TrialWarningModal.tsx
  - src/middleware.ts
autonomous: true
requirements:
  - REQ-10
must_haves:
  truths:
    - "Register page shows factoryName and phone as first two fields (before email/password)"
    - "Trial banner appears on all pages showing 'Con X ngay' with upgrade button"
    - "Admin sees non-dismissible warning modal during final 3 days of trial on login"
    - "Write operations (POST/PATCH/DELETE) to /api/* are blocked when subscription is EXPIRED/CANCELLED"
  artifacts:
    - path: "src/app/(auth)/register/page.tsx"
      provides: "Registration form with factoryName + phone first, calls POST /api/auth/register"
    - path: "src/components/trial/TrialBanner.tsx"
      provides: "Global persistent banner on all pages for TRIAL subscriptions"
    - path: "src/components/trial/TrialWarningModal.tsx"
      provides: "Non-dismissible 3-day warning modal for ADMIN on login"
    - path: "src/middleware.ts"
      provides: "Read-only enforcement blocking writes when subscription inactive"
  key_links:
    - from: "src/components/trial/TrialBanner.tsx"
      to: "src/lib/subscription-status.ts"
      via: "getFactorySubscription(user.factoryId)"
    - from: "src/middleware.ts"
      to: "src/lib/subscription-status.ts"
      via: "getFactorySubscription() + isSubscriptionActive()"
---

<objective>
Build frontend components for Phase 6: reordered registration UI, global trial banner, 3-day warning modal, and middleware read-only enforcement. Depends on 06-01a completing the schema push.
</objective>

<execution_context>
@D:/IceFlow SaaS/.claude/get-shit-done/workflows/execute-plan.md
@D:/IceFlow SaaS/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/06-trial-pricing-onboarding/06-CONTEXT.md
@.planning/phases/06-trial-pricing-onboarding/06-RESEARCH.md
@.planning/phases/06-trial-pricing-onboarding/06-01a-PLAN.md

# Interface contracts

From src/lib/subscription-status.ts (created in 06-01a):
```typescript
export async function getFactorySubscription(factoryId: string): Promise<Subscription | null>
export function isSubscriptionActive(sub: Subscription | null): boolean
export function getDaysRemaining(sub: Subscription | null): number
export function isWithinWarningPeriod(sub: Subscription | null): boolean
export function isGracePeriodExpired(sub: Subscription | null): boolean
```

From src/lib/auth.ts (existing):
```typescript
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  factoryId?: string  // ADMIN user.id = factoryId
}
export function useAuth(): { user: User | null; loading: boolean; ... }
```

From src/components/dashboard/sidebar.tsx (existing pattern):
```typescript
// Sidebar wraps children in main content area
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Register Page UI — Reorder Fields (Phone + Factory Name First)</name>
  <files>src/app/(auth)/register/page.tsx</files>
  <read_first>
- src/app/(auth)/register/page.tsx (existing register page)
- src/lib/auth.ts (existing auth context)
</read_first>
  <action>
Modify src/app/(auth)/register/page.tsx:

1. Reorder form fields to this sequence (per D-01):
   - factoryName: text input, label "Tên nhà máy / Doanh nghiệp", placeholder "Nhà máy đá ABC"
   - phone: tel input, label "Số điện thoại liên hệ", placeholder "09xxxxxxxx"
   - name: text input, label "Tên người quản lý"
   - email: email input (existing)
   - password: password input (existing)

2. Keep existing styling (shadcn/ui form components)

3. Form submit sends all fields to API: { factoryName, phone, email, password, name }

4. Keep tagline: "Bắt đầu dùng thử miễn phí 14 ngày"

5. On submit error: show existing red alert pattern

6. On submit success: redirect to /dashboard

Keep email and password validation (Zod schema) unchanged.
</action>
  <verify>
grep -n "factoryName\|Tên nhà máy" src/app/\(auth\)/register/page.tsx | head -5 && grep -n "phone.*label\|Số điện thoại" src/app/\(auth\)/register/page.tsx | head -3
</verify>
  <done>
Register page has factoryName as first input field, phone as second field, name as third field. Form submit sends {factoryName, phone, email, password, name} to POST /api/auth/register. Page compiles without TypeScript errors.</done>
</task>

<task type="auto">
  <name>Task 2: Trial Banner Component (Global Persistent)</name>
  <files>src/components/trial/TrialBanner.tsx</files>
  <read_first>
- src/lib/auth-provider.tsx (useAuth hook)
- src/lib/subscription-status.ts (getFactorySubscription, getDaysRemaining, isSubscriptionActive)
- src/components/dashboard/sidebar.tsx (existing layout pattern)
</read_first>
  <action>
Create src/components/trial/TrialBanner.tsx:

```typescript
'use client';

import { useAuth } from '@/lib/auth-provider';
import { getFactorySubscription, getDaysRemaining, isSubscriptionActive, isGracePeriodExpired } from '@/lib/subscription-status';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function TrialBanner() {
  const { user } = useAuth();
  const [bannerData, setBannerData] = useState<{
    type: 'trial' | 'expired' | 'cancelled' | 'grace' | null;
    daysRemaining: number;
  }>({ type: null, daysRemaining: 0 });

  useEffect(() => {
    if (!user?.factoryId) return;
    
    getFactorySubscription(user.factoryId).then(sub => {
      if (!sub || isSubscriptionActive(sub) && sub.planType === 'PAID') {
        setBannerData({ type: null, daysRemaining: 0 });
        return;
      }
      
      if (sub.status === 'CANCELLED' && isGracePeriodExpired(sub)) {
        setBannerData({ type: 'cancelled', daysRemaining: 0 });
        return;
      }
      
      if (sub.status === 'CANCELLED') {
        setBannerData({ type: 'grace', daysRemaining: getDaysRemaining(sub) });
        return;
      }
      
      if (!isSubscriptionActive(sub)) {
        setBannerData({ type: 'expired', daysRemaining: 0 });
        return;
      }
      
      setBannerData({ type: 'trial', daysRemaining: getDaysRemaining(sub) });
    });
  }, [user]);

  if (!bannerData.type) return null;

  const bannerStyles = {
    trial: 'bg-yellow-50 border-yellow-400 text-yellow-800',
    expired: 'bg-red-50 border-red-400 text-red-800',
    cancelled: 'bg-orange-50 border-orange-400 text-orange-800',
    grace: 'bg-orange-50 border-orange-400 text-orange-800',
  };

  const bannerText = {
    trial: `Bạn đang dùng thử IceFlow. Còn ${bannerData.daysRemaining} ngày nữa.`,
    expired: 'Dùng thử đã hết hạn. Tài khoản chỉ có thể đọc.',
    cancelled: 'Tài khoản đã bị khóa do hết thời gian gia hạn.',
    grace: `Tài khoản đã hủy. Còn ${bannerData.daysRemaining} ngày trong giai đoạn chờ (chỉ đọc).`,
  };

  return (
    <div className={`w-full px-4 py-2 border-b ${bannerStyles[bannerData.type]}`}>
      <div className="container mx-auto flex items-center justify-between">
        <span className="text-sm font-medium">
          {bannerText[bannerData.type]}
        </span>
        {bannerData.type === 'trial' && (
          <Link
            href="/settings/billing"
            className="text-sm font-semibold underline hover:no-underline"
          >
            Nâng cấp ngay
          </Link>
        )}
      </div>
    </div>
  );
}
```

Export as named export: `TrialBanner`
</action>
  <verify>
grep -n "export function TrialBanner" src/components/trial/TrialBanner.tsx && grep -n "getDaysRemaining\|getFactorySubscription" src/components/trial/TrialBanner.tsx | head -5
</verify>
  <done>
TrialBanner.tsx exists with named export. Banner shows for TRIAL (yellow, "Con X ngay" + "Nâng cấp ngay" link). Banner shows for EXPIRED/CANCELLED (red/orange). Banner returns null for PAID subscriptions. Component uses useAuth() to get user.factoryId.</done>
</task>

<task type="auto">
  <name>Task 3: Trial Warning Modal (3-Day Non-Dismissible)</name>
  <files>src/components/trial/TrialWarningModal.tsx</files>
  <read_first>
- src/app/(auth)/login/page.tsx (existing login page)
- src/lib/subscription-status.ts (isWithinWarningPeriod)
</read_first>
  <action>
Create src/components/trial/TrialWarningModal.tsx:

```typescript
'use client';

import { isWithinWarningPeriod, getDaysRemaining } from '@/lib/subscription-status';
import type { Subscription } from '@prisma/client';
import { useRouter } from 'next/navigation';

interface TrialWarningModalProps {
  subscription: Subscription;
  onDismiss?: () => void; // optional callback
}

export function TrialWarningModal({ subscription, onDismiss }: TrialWarningModalProps) {
  const router = useRouter();
  const daysRemaining = getDaysRemaining(subscription);
  const isWarning = isWithinWarningPeriod(subscription);

  if (!isWarning) return null;

  const handleUpgrade = () => {
    router.push('/settings/billing');
  };

  const handleContact = () => {
    window.location.href = 'mailto:support@iceflow.vn';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">⚠️</div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Thời gian dùng thử sắp kết thúc
            </h2>
            <p className="text-gray-600 mb-4">
              Còn <strong>{daysRemaining} ngày</strong> trước khi tài khoản chuyển sang chế độ chỉ đọc. 
              Để không gián đoạn công việc, vui lòng nâng cấp hoặc liên hệ hỗ trợ.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleUpgrade}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Nâng cấp ngay
              </button>
              <button
                onClick={handleContact}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                Liên hệ hỗ trợ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

Note: This modal is non-dismissible by design (no X button, no backdrop click close) per D-06.
</action>
  <verify>
grep -n "export function TrialWarningModal\|Non-dismissible\|isWithinWarningPeriod" src/components/trial/TrialWarningModal.tsx | head -5
</verify>
  <done>
TrialWarningModal.tsx exists. Modal shows when isWithinWarningPeriod(subscription) is true. Modal has no X close button and does not close on backdrop click. Modal shows [Nâng cấp ngay] and [Liên hệ hỗ trợ] buttons.</done>
</task>

<task type="auto">
  <name>Task 4: Middleware — Extend Read-Only Enforcement</name>
  <files>src/middleware.ts</files>
  <read_first>
- src/middleware.ts (existing middleware with role checks)
- src/lib/subscription-status.ts (getFactorySubscription, isSubscriptionActive, isGracePeriodExpired)
- src/lib/auth.ts (verifyJWT, JWTPayload)
</read_first>
  <action>
Extend src/middleware.ts to add subscription read-only enforcement:

1. Import at top of middleware:
   ```typescript
   import { getFactorySubscription, isSubscriptionActive, isGracePeriodExpired } from '@/lib/subscription-status';
   ```

2. After the existing role/auth check, add subscription check for non-GET requests:
   ```typescript
   // After session is verified and role check passes:
   if (request.method !== 'GET') {
     const session = await verifyJWT(token);
     if (session) {
       const factoryId = (session as { factoryId?: string }).factoryId;
       if (factoryId) {
         const sub = await getFactorySubscription(factoryId);
         if (sub) {
           // CANCELLED with expired grace period = fully locked
           if (sub.status === 'CANCELLED' && isGracePeriodExpired(sub)) {
             return NextResponse.json(
               { error: 'Subscription cancelled and grace period expired. Account locked.', code: 'ACCOUNT_LOCKED' },
               { status: 403 }
             );
           }
           // Any inactive subscription = read-only
           if (!isSubscriptionActive(sub)) {
             return NextResponse.json(
               { error: 'Subscription inactive. System is read-only.', code: 'READ_ONLY' },
               { status: 403 }
             );
           }
         }
       }
     }
   }
   ```

3. GET requests are never blocked by subscription status (read-only access allowed)

4. Keep existing redirect behavior for /login, /register routes

5. This enforcement is defense-in-depth; API routes should also check subscription status at handler level.
</action>
  <verify>
grep -n "isSubscriptionActive\|isGracePeriodExpired\|READ_ONLY\|ACCOUNT_LOCKED" src/middleware.ts | head -10
</verify>
  <done>
middleware.ts imports getFactorySubscription, isSubscriptionActive, isGracePeriodExpired. middleware.ts blocks POST/PATCH/DELETE on /api/* when subscription is CANCELLED+expired (ACCOUNT_LOCKED) or EXPIRED/CANCELLED inactive (READ_ONLY). GET requests are not blocked.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client -> API | Untrusted input crosses middleware |
| middleware -> subscription status | Server-side DB query, trusted |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-04 | Tampering | Middleware subscription check | mitigate | Check subscription on every non-GET request; return 403 READ_ONLY or ACCOUNT_LOCKED |
| T-06-05 | Denial of Service | Subscription check on every request | accept | Prisma query is fast; caching acceptable for future optimization |
</threat_model>

<verification>
1. `grep -n "TrialBanner\|TrialWarningModal" src/components/trial/` shows both components exist
2. `grep -n "READ_ONLY\|ACCOUNT_LOCKED" src/middleware.ts` shows middleware blocks writes
3. `grep -n "factoryName.*input\|phone.*input" src/app/(auth)/register/page.tsx` shows correct field order
</verification>

<success_criteria>
- TrialBanner shows on all pages for TRIAL subscriptions with days remaining and upgrade link
- TrialWarningModal shows on login when within 3-day warning period (ADMIN only, non-dismissible)
- Register page has factoryName and phone as first two fields
- Middleware blocks writes when subscription is inactive (EXPIRED/CANCELLED/CANCELLED+grace-expired)
</success_criteria>

<output>
After completion, create `.planning/phases/06-trial-pricing-onboarding/06-01b-SUMMARY.md`
</output>
