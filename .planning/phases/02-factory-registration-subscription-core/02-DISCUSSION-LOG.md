# Phase 02: Factory Registration + Subscription Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 02-factory-registration-subscription-core
**Areas discussed:** Driver Count Enforcement, Read-only Mode UX, Trial Expiry Flow

---

## Driver Count Enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Block at driver creation | 403 when creating 2nd+ driver | |
| Block at subscription check | Driver record created; block only on assignment/check | ✓ |
| Soft warning only | Warning but no block | |

**User's choice:** Block at subscription check
**Notes:** Driver record can be created for setup, but assigning to order or subscription check triggers block if driverCount exceeded. 1 admin free, paid per driver.

---

## Read-only Mode UX

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only + banner | Reads OK + warning banner on dashboard | |
| Silent reads + toast | 403 with toast notification on writes | |
| Full lock screen | Redirect to lock screen page | |

**User's choice:** Read-only + banner
**Notes:** Banner on all pages via shared layout. Persists across navigation. Warning: "Hệ thống chỉ đọc — Subscription hết hạn. Liên hệ Admin để nâng cấp."

---

## Banner Location

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard only | Banner only on dashboard page | |
| All pages (layout) | Banner in shared layout, all pages | ✓ |
| Per-page with upgrade CTA | Banner + upgrade button | |

**User's choice:** All pages (layout)
**Notes:** Persistent warning visible regardless of which page staff is on.

---

## Trial Expiry Warning

| Option | Description | Selected |
|--------|-------------|----------|
| 3 days before | Warning when ≤3 days remaining | ✓ |
| 1 day before | Warning only when ≤1 day remaining | |
| No pre-warning | No warning, only read-only when expired | |

**User's choice:** 3 ngày trước
**Notes:** Staff can proactively contact admin before system goes read-only.

---

## Deferred Ideas

- FACT-04 (7-day grace period) → Phase 04
- SUB-04/05 (manual payment, VietQR) → Phase 03
- Super Admin dashboard → Phase 03