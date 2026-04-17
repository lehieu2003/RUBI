# Phase 6: Trial, Pricing & Onboarding - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert ice factory owners from pen-and-paper to IceFlow SaaS through frictionless 14-day trial + clear, flexible pricing. Trial requires no credit card. When trial expires, system goes read-only. On cancel, data exported to Excel. Payment collection is manual (offline bank transfer).

This phase delivers: trial signup flow, subscription model, trial expiration behavior, pricing display, upgrade flow, cancel with data export.

</domain>

<decisions>
## Implementation Decisions

### Trial Signup Flow
- **D-01:** Full account creation at signup — Phone + Factory Name + Email + Password. UX: Phone and Factory Name fields appear first (before email/password) to feel business-focused.
- **D-02:** Separate Subscription model — Not on User model. Subscription links to factory/account with: planType (TRIAL/PAID), startDate, endDate, driverCount, status (ACTIVE/CANCELLED/EXPIRED). Reason: factory may have multiple users, trial belongs to factory not individual.
- **D-03:** Trial starts on registration date — Not first login. Standard SaaS convention. Admin can manually extend via DB for customer care situations.

### Expiration Behavior
- **D-04:** Read-only mode on expiration — When trial expires, all WRITE operations blocked: order creation, settlement, inventory adjustment, debt correction. READ operations allowed: view customers, view debt reports, view order history.
- **D-05:** Global sidebar/top-bar banner — Persistent yellow/orange banner on ALL pages (not just dashboard). Shows: "Bạn đang dùng thử. Còn X ngày nữa sẽ chuyển sang chế độ Read-only. [Nâng cấp ngay]". Reason: staff spend most time in Orders page, not Dashboard.
- **D-06:** 3-day warning modal — On login during final 3 days, show non-dismissible modal to Admin only (not Staff): "Thời gian dùng thử sắp kết thúc sau 3 ngày. Để không gián đoạn, vui lòng liên hệ..."
- **D-07:** Admin override via DB only — No UI for trial extension in v1. Solo dev can extend via Prisma Studio or SQL console. Simple: `UPDATE subscriptions SET end_date = ... WHERE ...`

### Pricing Model
- **D-08:** Per-driver pricing — Count all drivers assigned to factory (Active status in DB), not just those who logged in. Reason: stable roster, predictable revenue, no disputes about "he only logged in once."
- **D-09:** Admin free — 1 admin account always free. Charge only for drivers. Model: Free 1 Admin + N Drivers (charged). Staff/Accountant can be bundled free or at driver-rate in future tiers.
- **D-10:** Single price — No tiers. One price per driver/month (e.g., 150k-200k VND/driver/month). Simple: 2 drivers = ~400k/month, 4 drivers = ~800k/month. Reason: small factories (2-4 trucks) don't need tier complexity.
- **D-11:** Payment recording — System tracks what each factory owes. Monthly invoice auto-generated based on driver count. Display VietQR with content: "THANH TOAN ICEFLOW [TEN_LO_DA] T4/2026". Admin confirms payment manually to extend subscription +30 days.

### Cancel + Data Export
- **D-12:** Export after cancel confirmation — User confirms cancel → system shows data preview → auto-download Excel → account enters 7-day grace period (read-only).
- **D-13:** Two-sheet Excel export — Sheet 1: Customer list with debt (name, code, phone, address, outstanding balance, shell deposits owed). Sheet 2: Order history (last 3-6 months) for dispute resolution. Reason: single sheet too sparse, full dump too overwhelming.
- **D-14:** Retention offer on cancel — Cancel flow: "Trước khi xác nhận, bạn có muốn xuất dữ liệu công nợ không?" Three buttons: [Xuất dữ liệu & Hủy] | [Tiếp tục dùng thử] | [Liên hệ hỗ trợ]. Reason: some users cancel out of confusion, not intentional.
- **D-15:** 7-day grace period after cancel — Account read-only for 7 days, then locked. Data soft-deleted (kept 30 days on server) for possible reactivation.

### Onboarding Import
- **D-16:** Customer/price list import — Import customers from existing data (CSV or manual entry). Each customer: code, name, phone, address. Import price lists per customer. This happens after trial starts, during onboarding.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documents
- `.planning/PROJECT.md` — Core constraint: Speed over everything, web-only, roles: ADMIN (owner), ACCOUNTANT, STAFF
- `.planning/REQUIREMENTS.md` — REQ-10 (trial), REQ-11 (pricing), REQ-12 (onboarding)
- `.planning/ROADMAP.md` — Phase 6 goal and success criteria (4 pages of success criteria)
- `.planning/phases/01-foundation-order-entry/01-CONTEXT.md` — Phase 1: Order model, Customer model, status enum
- `.planning/phases/03-driver-delivery-view/03-CONTEXT.md` — Phase 3: Driver model, token auth, Driver view
- `.planning/phases/04-status-enum-fixes/04-CONTEXT.md` — Phase 4: status enum workflow PENDING→SHIPPING→DELIVERED→COMPLETED
- `.planning/phases/05-reconciliation-reporting/05-CONTEXT.md` — Phase 5: CustomerDebtLedger, CustomerShellDeposit, debt tracking

### Code References
- `prisma/schema.prisma` — User model (id, email, password, name, role, isActive), Driver model (token, factory link), Customer model (code, name, phone, address, debtLedger, shellDeposit)
- `src/lib/auth.ts` — JWT sign/verify (HS256, 7-day expiry), setSessionCookie, clearSessionCookie
- `src/app/api/auth/register/route.ts` — Current register endpoint (email, password, name — needs extension for phone, factoryName, Subscription creation)
- `src/app/(auth)/register/page.tsx` — Current register UI (needs reformat for trial signup: phone + factory name first)
- `src/app/(auth)/login/page.tsx` — Login page (needs trial warning modal integration)
- `src/components/dashboard/sidebar.tsx` — Sidebar (needs global trial banner)

### No external specs — all requirements captured in decisions above

</canonical_refs>

<codebase>
## Existing Code Insights

### Reusable Assets
- JWT auth from `src/lib/auth.ts` — extend with subscription awareness (check subscription status on every authenticated request)
- Existing register/login pages — modify for trial signup flow
- Existing sidebar component — add global trial banner
- Prisma schema — extend with Subscription model, add trial fields

### Established Patterns
- Zod validation for all API inputs (already in use)
- Prisma transactions for atomic operations (Phase 5)
- Role-based access via middleware (existing RBAC)
- API routes in `src/app/api/` — new endpoints for subscription management

### Integration Points
- New `Subscription` model links to factory (User with ADMIN role or separate factory entity)
- Trial banner: inject into sidebar or create a wrapper component
- Expiration check: middleware or getSession() extension
- Cancel flow: new API endpoint (POST /api/subscriptions/cancel), Excel export via xlsx library
- Payment confirmation: new Admin UI in settings/billing section

</codebase>

<specifics>
## Specific Ideas

1. **VietQR standard** — Vietnam QR payment standard. Generate QR from: bank account + amount + content template. Content template: "THANH TOAN ICEFLOW [TEN_LO_DA] T4/2026" (factory name + month/year).

2. **Excel export library** — Use `xlsx` (SheetJS) for client-side Excel generation. No server-side Office dependency needed. Can generate and trigger download entirely in browser.

3. **Soft delete vs hard delete** — On cancel, mark subscription as CANCELLED, not delete. User can reactivate within 30 days. After 30 days, data is hard-deleted or anonymized per Vietnam data regulations.

4. **Trial = Subscription with planType=TRIAL** — No separate Trial model. Extend Subscription: `{ id, factoryId, planType, startDate, endDate, status, driverCount, pricePerDriver, createdAt }`. PAID follows same structure.

</specifics>

<deferred>
## Deferred Ideas

### Actual MoMo/ZaloPay integration (Phase 7+)
- Real payment gateway integration — deferred after manual payment recording works

### Email notifications (Phase 7+)
- Trial expiration email at 3 days, 1 day, expired — deferred to Phase 7

### Staff/Accountant paid accounts (Phase 7+)
- Whether to charge for extra non-driver accounts — deferred after pricing model stabilizes

### Per-order pricing (rejected)
- Transaction-based pricing (pay per order) — rejected, per-driver monthly is simpler

---

*Phase: 06-trial-pricing-onboarding*
*Context gathered: 2026-04-17*