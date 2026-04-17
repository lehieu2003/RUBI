# Phase 6: Trial, Pricing & Onboarding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 06-trial-pricing-onboarding
**Areas discussed:** Trial signup flow, Expiration behavior, Pricing model, Cancel + export

---

## Trial signup flow

| Option | Description | Selected |
|--------|-------------|----------|
| A: Phone + factory name only (no email/password yet) | Quick signup, trial activates | |
| **B: Phone + factory name + email + password** | Full account at signup, trial activates immediately | ✓ |
| C: Email + password first (phone secondary) | Email-first like current register | |

**User's choice:** B — Full account creation at signup
**Notes:** Phone and factory name fields first (before email/password) for business-focused UX. Creates identity immediately, enables email notifications, upgrade just changes status.

### Q2: Trial Metadata Storage

| Option | Description | Selected |
|--------|-------------|----------|
| A: User model fields (trialStartDate, trialEndDate, isTrial) | Add fields directly to User | |
| **B: Separate Subscription model** | New table linking to factory | ✓ |
| C: Hybrid | Both — subscription on factory, trial fields on user | |

**User's choice:** B — Separate Subscription model
**Notes:** Factory can have multiple users. Trial/subscription belongs to factory, not individual. Enables history tracking (trial → expired → renewed). Long-term maintainability.

### Q3: Trial Trigger (countdown start)

| Option | Description | Selected |
|--------|-------------|----------|
| **A: Registration date** | Trial starts automatically on account creation | ✓ |
| B: First login date | Trial starts when they first log in | |
| C: Explicit activation | Admin manually starts trial | |

**User's choice:** A — Registration date
**Notes:** Standard SaaS convention. Creates urgency. Admin can always extend via DB for customer care.

---

## Expiration behavior

**User's choice (confirmation):** Read-only mode when trial expires
- BLOCKED: Order creation, Settlement, Inventory adjustment, Debt correction
- ALLOWED: View customers, View debt reports, View order history
- REDIRECT: Blocked actions show Overlay/Popup with "Liên hệ hỗ trợ" button

### Q2: Banner Location

| Option | Description | Selected |
|--------|-------------|----------|
| A: Dashboard only | Big banner at top of dashboard | |
| **B: Global sidebar/top-bar banner** | Persistent on all pages | ✓ |
| C: Dashboard + login page | Both dashboard banner + login screen | |

**User's choice:** B — Global sidebar/top-bar banner
**Notes:** Staff spend most time in Orders page, not Dashboard. Yellow/orange thin banner at top or bottom of sidebar. Persistent urgency.

### Q3: 3-day Warning

| Option | Description | Selected |
|--------|-------------|----------|
| A: Soft banner (dismissible) | Banner only | |
| B: Modal on login (one-time) | Non-dismissible modal | |
| **C: Both (Global Banner + Modal on Login)** | Banner everywhere + modal for admin on login | ✓ |

**User's choice:** C — Both
**Notes:** Modal only shown to Admin on login during final 3 days. Staff see only banner (don't overwhelm them). Non-dismissible modal for admin.

### Q4: Admin Override (trial extension UI)

| Option | Description | Selected |
|--------|-------------|----------|
| **A: Yes, with audit log** | Extend button in Admin settings with reason field | |
| B: Yes, simple | Extend trial button in settings | |
| C: No, DB only | Manual SQL/Prisma Studio only | |

**User's choice:** C — Manual DB edit only for v1
**Notes:** Solo dev, don't waste time on admin UI for this. With <50 factories, can do 30-second SQL update. Keep UI lean and focused on revenue-generating features.

---

## Pricing model

### Q1: Driver Billing Unit

| Option | Description | Selected |
|--------|-------------|----------|
| A: Active drivers only | Count only drivers who logged in this month | |
| **B: Assigned drivers (Active status in DB)** | Count all drivers in roster | ✓ |
| C: Both | Active count with minimum charge | |

**User's choice:** B — Assigned drivers
**Notes:** Predictable revenue, no disputes. If factory wants to reduce cost, they delete/deactivate drivers in system.

### Q2: Admin Account

| Option | Description | Selected |
|--------|-------------|----------|
| **A: Admin free (1 admin always free)** | Admin not counted in driver billing | ✓ |
| B: Admin counted | Admin counts as a "driver" | |
| C: Included as "1 free user" | Any plan = 1 admin + N drivers | |

**User's choice:** A — Admin free
**Notes:** Psychological play: owner feels they're paying for "labor tools" (drivers), not for their own seat. Free 1 Admin + N Drivers (charged).

### Q3: Plan Tiers

| Option | Description | Selected |
|--------|-------------|----------|
| **A: Single price** | One price per driver/month | ✓ |
| B: Starter + Growth tiers | Starter: max 3 drivers, Growth: unlimited | |
| C: Per-driver + minimum | Single price but minimum 2 drivers | |

**User's choice:** A — Single price
**Notes:** "Simple is best" for small factories (2-4 trucks). ~150k-200k VND/driver/month. 2 drivers = ~400k/month, 4 drivers = ~800k/month. Very easy to close deals — cheap relative to preventing shell deposit losses.

### Q4: Payment Collection (v1)

| Option | Description | Selected |
|--------|-------------|----------|
| A: Manual invoicing | End of month, calculate and contact them | |
| **B: Recording only** | System tracks what they owe, manual payment collection offline | ✓ |
| C: Bank info only | Display bank account, no tracking | |

**User's choice:** B — Recording only (with VietQR)
**Notes:** Professional approach. System has "Gói cước & Thanh toán" Admin screen. Monthly auto-generated invoice based on driver count. Display VietQR with content template "THANH TOAN ICEFLOW [TEN_LO_DA] T4/2026". Admin clicks [Xác nhận thanh toán] to extend +30 days.

---

## Cancel + data export

### Q1: Export Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| A: During cancel | Export immediately on cancel click | |
| **B: After cancel confirmation** | Show preview, confirm, then auto-download | ✓ |
| C: Email delivery | Export sent via email within 24 hours | |

**User's choice:** B — After cancel confirmation
**Notes:** Most transparent flow. User confirms cancel → sees data preview → auto-download → 7-day grace period.

### Q2: Export Format

| Option | Description | Selected |
|--------|-------------|----------|
| A: Customers only | Customer list with outstanding debt | |
| B: Customers + Orders | Customers + order history | |
| C: Full data dump | Everything: customers, orders, inventory, debt, drivers | |
| **D: Two sheets** | Sheet 1: Customer + debt. Sheet 2: Order history (3-6 months) | ✓ |

**User's choice:** D — Two sheets
**Notes:** Single sheet too sparse, full dump too overwhelming. Sheet 1 = "Sổ cái" for manual debt collection. Sheet 2 = dispute resolution with order history.

### Q3: Cancel Confirmation UX

| Option | Description | Selected |
|--------|-------------|----------|
| A: Simple confirm | "Are you sure? Data exported, account closed." | |
| B: Data preview | Show summary before confirming | |
| **C: Retention offer** | "Before you cancel, export your data?" with 3 buttons | ✓ |

**User's choice:** C — Retention offer
**Notes:** Some users cancel out of confusion, not intentional. Flow: Click "Hủy dịch vụ" → Popup: "Trước khi xác nhận..." → [Xuất dữ liệu & Hủy] | [Tiếp tục dùng thử] | [Liên hệ hỗ trợ].

### Q4: After Cancel (account status)

| Option | Description | Selected |
|--------|-------------|----------|
| A: Immediate lockout | Access blocked immediately | |
| **B: 7-day grace period (read-only)** | 7 days read-only, then locked | ✓ |
| C: Soft delete | Mark cancelled, allow reactivation within 30 days | |

**User's choice:** B + C combined — 7-day grace period, then soft delete for 30 days
**Notes:** Prevents accidental data loss. 7 days read-only → locked. Data kept 30 days server-side for possible reactivation.

---

## Deferred Ideas

- Actual MoMo/ZaloPay integration (Phase 7+) — deferred after manual payment recording works
- Email notifications for trial expiration (Phase 7+)
- Staff/Accountant paid accounts (Phase 7+)