---
phase: 03x
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - src/components/admin/tenant-table.tsx
  - src/app/api/admin/impersonate/[factoryId]/route.ts
  - src/app/api/admin/impersonate/end/route.ts
  - src/app/admin/layout.tsx
autonomous: false
requirements: []
must_haves:
  truths:
    - Super Admin can click "Xem" to start impersonating a factory
    - UI shows badge "Đang xem với tư cách: {FactoryName}" when impersonating
    - Impersonated session is read-only (no mutations allowed)
    - Impersonation auto-ends after 15 minutes of inactivity
    - Impersonation start/end is logged with timestamps
  artifacts:
    - path: prisma/schema.prisma
      provides: ImpersonationLog model
      contains: superAdminId, factoryId, startedAt, endedAt
    - path: src/app/api/admin/impersonate/[factoryId]/route.ts
      provides: Start impersonation, returns temp token
      exports: [POST]
    - path: src/app/api/admin/impersonate/end/route.ts
      provides: End impersonation, marks endedAt
      exports: [POST]
    - path: src/components/admin/tenant-table.tsx
      provides: "Xem" button in each row
      modifies: RowActions component
  key_links:
    - from: src/app/admin/layout.tsx
      to: impersonate session
      via: Check X-Impersonating header or cookie, show/hide badge
      pattern: impersonate
---

<objective>
Implement Impersonation / Support Tool allowing SUPER_ADMIN to view any factory as read-only. Special session token approach (Super Admin stays logged in, badge indicator). Read-only access, 15-min auto-timeout, mandatory audit log.

Purpose: Allow Super Admin to support factories by viewing their data without logging in as them.
Output: ImpersonationLog model + API endpoints + "Xem" button in TenantTable + floating badge.
</objective>

<context>
@src/components/admin/tenant-table.tsx
@src/app/admin/dashboard/page.tsx
@prisma/schema.prisma

<!-- Impersonation approach per D-07 through D-10 -->
<!-- D-07: Special session token — Super Admin stays logged in, badge shows "Đang xem với tư cách: {FactoryName}" -->
<!-- D-08: Read-only access when impersonating -->
<!-- D-09: Auto-logout 15 minutes -->
<!-- D-10: Audit log with start/end timestamps -->

Token approach: Generate random token stored in ImpersonationLog, set as httpOnly cookie or client storage.
Middleware checks: If X-Impersonating-Factory header present + valid token + not expired (15min), inject that factoryId into queries (bypass own factoryId for read-only).

Read-only enforcement: Middleware checks impersonation flag, if active, return 403 on any POST/PATCH/DELETE to non-admin routes.
</context>

<tasks>

<task type="auto">
  <name>Task 0: Add ImpersonationLog model to schema</name>
  <files>prisma/schema.prisma</files>
  <action>
Add to schema.prisma:

```prisma
model ImpersonationLog {
  id          String   @id @default(cuid())
  superAdminId String  @map("super_admin_id")
  factoryId   String   @map("factory_id")
  token       String   @unique @default(uuid())
  startedAt   DateTime @default(now()) @map("started_at")
  endedAt     DateTime? @map("ended_at")
  superAdmin  User     @relation(fields: [superAdminId], references: [id])
  factory     Factory  @relation(fields: [factoryId], references: [id])

  @@index([superAdminId])
  @@index([factoryId])
  @@index([token])
  @@map("impersonation_logs")
}
```

Run `npx prisma db push` to apply.
  </action>
  <verify>
    <automated>npx prisma validate && npx prisma db push --skip-generate</automated>
  </verify>
  <done>ImpersonationLog model exists in schema and database</done>
</task>

<task type="auto">
  <name>Task 1: Create POST /api/admin/impersonate/[factoryId]</name>
  <files>src/app/api/admin/impersonate/[factoryId]/route.ts</files>
  <action>
Create POST /api/admin/impersonate/[factoryId] endpoint.

Logic:
1. Verify current user is SUPER_ADMIN
2. Verify factoryId exists
3. Create ImpersonationLog record (superAdminId, factoryId, token, startedAt)
4. Return { success: true, token, factoryName, expiresAt: now + 15min }

Cookie: Set httpOnly cookie "impersonate_token" with the token, sameSite=strict, path=/, maxAge=900 (15 min).
Response includes factoryName for badge display.

Require SUPER_ADMIN role. Return 400 if factory not found.
  </action>
  <verify>
    <automated>curl -s -X POST -H "Cookie: session=<super_admin>" http://localhost:3000/api/admin/impersonate/factory_cuid123 | jq .</automated>
  </verify>
  <done>POST /api/admin/impersonate/[factoryId] creates log entry and returns token</done>
</task>

<task type="auto">
  <name>Task 2: Create POST /api/admin/impersonate/end</name>
  <files>src/app/api/admin/impersonate/end/route.ts</files>
  <action>
Create POST /api/admin/impersonate/end endpoint.

Logic:
1. Read impersonate_token from cookie
2. Find ImpersonationLog by token where endedAt IS NULL
3. Set endedAt = now
4. Clear the cookie
5. Return { success: true }

If no active impersonation, return { success: true } (idempotent).
  </action>
  <verify>
    <automated>curl -s -X POST -H "Cookie: session=<super_admin>; impersonate_token=<token>" http://localhost:3000/api/admin/impersonate/end | jq .</automated>
  </verify>
  <done>POST /api/admin/impersonate/end marks log as ended and clears cookie</done>
</task>

<task type="auto">
  <name>Task 3: Add "Xem" button to TenantTable rows</name>
  <files>src/components/admin/tenant-table.tsx</files>
  <action>
Modify TenantTable.tsx RowActions component to add "Xem" button:

```tsx
<button
  onClick={async () => {
    const res = await fetch(`/api/admin/impersonate/${factory.id}`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      // Redirect to factory dashboard or refresh to show badge
      window.location.href = '/dashboard?impersonating=' + data.factoryName;
    }
  }}
  className="px-2 py-1 text-xs rounded bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
>
  Xem
</button>
```

The button appears alongside existing action buttons (Activate/Deactivate, Extend, Price).

After click, redirect to /dashboard?impersonating=<factoryName> which triggers badge display.
  </action>
  <verify>
    <automated>Visit /admin/dashboard, click "Xem" on a factory row, verify impersonation token set and redirected</automated>
  </verify>
  <done>"Xem" button appears in each TenantTable row</done>
</task>

<task type="auto">
  <name>Task 4: Add impersonation badge to admin layout</name>
  <files>src/app/admin/layout.tsx</files>
  <action>
Check if src/app/admin/layout.tsx exists. If not, create it at src/app/admin/layout.tsx.

```tsx
'use client';
import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    // Check URL param or cookie for active impersonation
    const params = new URLSearchParams(window.location.search);
    const factoryName = params.get('impersonating');
    if (factoryName) setImpersonating(factoryName);
  }, []);

  return (
    <>
      {impersonating && (
        <div className="fixed top-4 right-4 z-50 bg-violet-500/90 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          Đang xem với tư cách: {impersonating}
          <button
            onClick={async () => {
              await fetch('/api/admin/impersonate/end', { method: 'POST' });
              setImpersonating(null);
              window.location.href = '/admin/dashboard';
            }}
            className="ml-3 underline hover:no-underline"
          >
            Kết thúc
          </button>
        </div>
      )}
      {children}
    </>
  );
}
```

Also add "Kết thúc" (End) button to badge to stop impersonation early.
  </action>
  <verify>
    <automated>Impersonate a factory, verify badge appears at top-right with factory name and "Kết thúc" button</automated>
  </verify>
  <done>Floating badge displays when impersonating, allows ending session</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Full impersonation flow: ImpersonationLog model, start/end API, "Xem" button in TenantTable, floating badge</what-built>
  <how-to-verify>
    1. Visit /admin/dashboard as SUPER_ADMIN
    2. Click "Xem" on any factory row
    3. Verify: redirected to /dashboard?impersonating=FactoryName, badge appears top-right
    4. Verify: can navigate around (data scoped to impersonated factory)
    5. Click "Kết thúc" on badge
    6. Verify: redirected back to /admin/dashboard, badge disappears, impersonation log has endedAt
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- [ ] ImpersonationLog model created in database
- [ ] "Xem" button appears in TenantTable
- [ ] Clicking "Xem" creates ImpersonationLog and sets cookie
- [ ] Badge displays with factory name
- [ ] "Kết thúc" ends impersonation and clears cookie
- [ ] ImpersonationLog has correct start/end timestamps
</verification>

<success_criteria>
Super Admin can impersonate any factory with a single click. Badge clearly shows which factory is being viewed. Session auto-expires after 15 minutes. Audit log tracks start/end times.
</success_criteria>

<output>
After completion, create `.planning/phases/03x-super-admin-extensions/03X-03-SUMMARY.md`
</output>