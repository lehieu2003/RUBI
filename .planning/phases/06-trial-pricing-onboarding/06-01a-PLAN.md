---
phase: "06"
plan: "01a"
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - src/app/api/auth/register/route.ts
  - src/lib/subscription-status.ts
autonomous: true
requirements:
  - REQ-10
must_haves:
  truths:
    - "New User registers with factoryName + phone + email + password, gets 14-day TRIAL subscription automatically"
    - "Subscription model links to factory via ADMIN User (factoryId = ADMIN User.id)"
    - "Write operations blocked when subscription is EXPIRED/CANCELLED (middleware defense-in-depth)"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "Subscription model with planType, startDate, endDate, status, driverCount"
    - path: "src/app/api/auth/register/route.ts"
      provides: "Atomic User + Subscription creation on register"
    - path: "src/lib/subscription-status.ts"
      provides: "getFactorySubscription, isSubscriptionActive, getDaysRemaining, isWithinWarningPeriod"
  key_links:
    - from: "src/app/api/auth/register/route.ts"
      to: "prisma/subscription"
      via: "prisma.$transaction([user.create, subscription.create])"
    - from: "src/middleware.ts"
      to: "src/lib/subscription-status.ts"
      via: "getFactorySubscription() + isSubscriptionActive()"
---

<objective>
Build the backend foundation for Phase 6: Subscription model in Prisma, atomic registration with User+Subscription creation, and subscription status helpers. This plan delivers the data model and API layer only (no UI).
</objective>

<execution_context>
@D:/IceFlow SaaS/.claude/get-shit-done/workflows/execute-plan.md
@D:/IceFlow SaaS/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/06-trial-pricing-onboarding/06-CONTEXT.md
@.planning/phases/06-trial-pricing-onboarding/06-RESEARCH.md

# Interface contracts

From prisma/schema.prisma (existing):
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  phone     String?
  role      UserRole @default(STAFF)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
enum UserRole { ADMIN STAFF ACCOUNTANT DRIVER }
```

From src/lib/auth.ts (existing):
```typescript
export interface JWTPayload {
  userId: string
  email: string
  name: string
  role: UserRole
}
export function signJWT(payload: JWTPayload): Promise<string>
export function verifyJWT(token: string): Promise<JWTPayload | null>
export function setSessionCookie(token: string): void
export function clearSessionCookie(): void
export async function getSession(req: Request): Promise<JWTPayload | null>
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Prisma Schema — Add Subscription Model</name>
  <files>prisma/schema.prisma</files>
  <read_first>
- prisma/schema.prisma (existing User model, enum UserRole, Driver model, Customer model)
</read_first>
  <action>
Add to prisma/schema.prisma:

1. Add to User model:
   - factoryId: String? @map("factory_id")
   - isFactoryOwner: Boolean @default(false) @map("is_factory_owner")
   - @@index([factoryId]) for fast lookups

2. Add SubscriptionPlan enum BEFORE the Subscription model:
   ```prisma
   enum SubscriptionPlan {
     TRIAL
     PAID
   }
   ```

3. Add SubscriptionStatus enum:
   ```prisma
   enum SubscriptionStatus {
     ACTIVE
     CANCELLED
     EXPIRED
   }
   ```

4. Add Subscription model:
   ```prisma
   model Subscription {
     id              String             @id @default(cuid())
     factoryId       String             @unique @map("factory_id")
     planType        SubscriptionPlan   @default(TRIAL) @map("plan_type")
     startDate       DateTime           @default(now()) @map("start_date")
     endDate         DateTime           @map("end_date")
     status          SubscriptionStatus @default(ACTIVE)
     driverCount     Int                @default(0) @map("driver_count")
     pricePerDriver  Decimal?           @map("price_per_driver") @db.Decimal(10, 2)
     createdAt       DateTime           @default(now()) @map("created_at")
     updatedAt       DateTime           @updatedAt @map("updated_at")

     factory         User               @relation(fields: [factoryId], references: [id])
     @@map("subscriptions")
   }
   ```

5. Add relation to User model:
   - factorySubscription: Subscription? relation (one-to-one via factoryId)

Map: users, subscriptions tables
</action>
  <verify>
grep -n "model Subscription" prisma/schema.prisma && grep -n "enum SubscriptionPlan" prisma/schema.prisma && grep -n "enum SubscriptionStatus" prisma/schema.prisma && grep -n "factoryId.*String.*@map" prisma/schema.prisma
</verify>
  <done>
Subscription model exists in schema.prisma with: id, factoryId, planType (TRIAL/PAID), startDate, endDate, status (ACTIVE/CANCELLED/EXPIRED), driverCount, pricePerDriver. User model has factoryId and isFactoryOwner fields. SubscriptionPlan and SubscriptionStatus enums defined.</done>
</task>

<task type="auto">
  <name>Task 2: Install Dependencies — xlsx and papaparse</name>
  <files>package.json</files>
  <read_first>
- package.json (existing dependencies)
</read_first>
  <action>
Install npm packages:
- xlsx@0.18.5
- papaparse

Run: npm install xlsx@0.18.5 papaparse
</action>
  <verify>
grep -n "xlsx\|papaparse" package.json && ls node_modules/xlsx 2>/dev/null && ls node_modules/papaparse 2>/dev/null
</verify>
  <done>
package.json contains "xlsx": "^0.18.5" and "papaparse" entries. node_modules/xlsx and node_modules/papaparse exist.</done>
</task>

<task type="auto">
  <name>Task 3: Registration API — Create User + Subscription Atomically</name>
  <files>src/app/api/auth/register/route.ts</files>
  <read_first>
- src/app/api/auth/register/route.ts (existing register endpoint)
- src/lib/auth.ts (signJWT, setSessionCookie, JWTPayload)
- prisma/schema.prisma (Subscription model fields)
</read_first>
  <action>
Modify src/app/api/auth/register/route.ts:

1. Add phone and factoryName to the request body validation (Zod schema):
   - phone: string, min 9 chars, max 15 chars
   - factoryName: string, min 2 chars, max 100 chars

2. After password hashing and before user creation, add factoryId:
   - factoryId will be the ADMIN user's id

3. Use prisma.$transaction to create User AND Subscription atomically:
   ```typescript
   const [user, subscription] = await prisma.$transaction([
     prisma.user.create({
       data: {
         email,
         password: hashedPassword,
         name,           // user's display name
         phone,
         role: 'ADMIN',
         isFactoryOwner: true,
         factoryId: undefined, // temporary, will update after user creation
       },
     }),
   ]);
   // Update user's factoryId to own id (ADMIN user IS the factory)
   await prisma.user.update({
     where: { id: user.id },
     data: { factoryId: user.id },
   });
   // Create Subscription linked to factoryId
   const subscription = await prisma.subscription.create({
     data: {
       factoryId: user.id,
       planType: 'TRIAL',
       startDate: new Date(),
       endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
       status: 'ACTIVE',
       driverCount: 0,
     },
   });
   ```

4. JWT payload must include factoryId for subscription checks:
   ```typescript
   const token = await signJWT({
     userId: user.id,
     email: user.email,
     name: user.name,
     role: user.role as UserRole,
     factoryId: user.id, // ADD THIS: ADMIN user.id = factoryId
   });
   ```

5. Keep existing redirect behavior (set cookie + return redirect).
</action>
  <verify>
grep -n "prisma.\$transaction" src/app/api/auth/register/route.ts && grep -n "factoryId" src/app/api/auth/register/route.ts && grep -n "planType.*TRIAL" src/app/api/auth/register/route.ts
</verify>
  <done>
Register endpoint creates User (ADMIN, factoryOwner, factoryId=self) and Subscription (TRIAL, 14 days) atomically. JWT payload includes factoryId. POST /api/auth/register with {factoryName, phone, email, password, name} returns success + sets auth cookie.</done>
</task>

<task type="auto">
  <name>Task 4: Subscription Status Helper Library</name>
  <files>src/lib/subscription-status.ts</files>
  <read_first>
- src/lib/auth.ts (existing JWT helpers, getSession)
- prisma/schema.prisma (Subscription model)
</read_first>
  <action>
Create src/lib/subscription-status.ts with these exports:

```typescript
import { PrismaClient } from '@prisma/client';
import type { Subscription } from '@prisma/client';

const prisma = new PrismaClient();

// Get the active subscription for a factory (ADMIN user = factory)
export async function getFactorySubscription(factoryId: string): Promise<Subscription | null> {
  return prisma.subscription.findFirst({
    where: { factoryId },
    orderBy: { createdAt: 'desc' },
  });
}

// Check if subscription allows writes
export function isSubscriptionActive(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.status === 'CANCELLED') return false;
  if (sub.status === 'EXPIRED') return false;
  if (sub.planType === 'TRIAL' && new Date() > sub.endDate) return false;
  return true;
}

// Get days remaining in trial/active period
export function getDaysRemaining(sub: Subscription | null): number {
  if (!sub) return 0;
  const msRemaining = sub.endDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
}

// Check if within 3-day warning period
export function isWithinWarningPeriod(sub: Subscription | null): boolean {
  if (!sub) return false;
  const days = getDaysRemaining(sub);
  return days <= 3 && days > 0;
}

// Check if grace period expired (for CANCELLED subscriptions)
export function isGracePeriodExpired(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.status !== 'CANCELLED') return false;
  return new Date() > sub.endDate;
}
```

Export types: Subscription, SubscriptionPlan, SubscriptionStatus from @prisma/client
</action>
  <verify>
grep -n "export async function getFactorySubscription\|export function isSubscriptionActive\|export function getDaysRemaining\|export function isWithinWarningPeriod" src/lib/subscription-status.ts
</verify>
  <done>
src/lib/subscription-status.ts exists and exports: getFactorySubscription(factoryId), isSubscriptionActive(sub), getDaysRemaining(sub), isWithinWarningPeriod(sub), isGracePeriodExpired(sub). File compiles without TypeScript errors.</done>
</task>

<task type="auto" tdd="true">
  <name>[BLOCKING] Task 5: Prisma Schema Push</name>
  <files>prisma/schema.prisma</files>
  <read_first>
- prisma/schema.prisma (modified with Subscription model)
</read_first>
  <action>
Run: npx prisma db push

This is BLOCKING — subsequent plans (06-01b) depend on the Subscription table existing in the database before middleware and UI components can be fully tested.
</action>
  <verify>
npx prisma db push 2>&1 | grep -i "synchronized\|migration\|created\|error" | head -5
</verify>
  <done>
npx prisma db push completes without error. Subscription table created in database. User table has factoryId and isFactoryOwner columns. prisma generate completes successfully.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client -> API | Untrusted input (email, phone, factoryName, password) crosses here |
| API -> Database | Server-side only, trusted |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-01 | Tampering | Registration API | mitigate | Zod validation on all inputs; bcrypt password hashing (12 rounds); Prisma parameterized queries |
| T-06-02 | Information Disclosure | Subscription data | accept | Subscription is factory-scoped; only ADMIN of same factory can query |
| T-06-03 | Denial of Service | Trial creation | accept | No rate limiting on register endpoint; acceptable for v1 |
</threat_model>

<verification>
1. `npx prisma db push` completes successfully
2. `npx prisma generate` completes successfully (types generated)
3. `grep -r "Subscription" src/lib/subscription-status.ts` shows helper functions
4. `grep -r "prisma.\$transaction" src/app/api/auth/register/route.ts` shows atomic creation
</verification>

<success_criteria>
- Subscription model added to prisma/schema.prisma with all required fields
- Register endpoint atomically creates User (ADMIN) + Subscription (TRIAL, 14 days)
- Subscription status helpers exported from src/lib/subscription-status.ts
- npm packages xlsx and papaparse installed
- Database schema pushed and in sync
</success_criteria>

<output>
After completion, create `.planning/phases/06-trial-pricing-onboarding/06-01a-SUMMARY.md`
</output>
