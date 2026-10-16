---
status: resolved
trigger: "#11 from .planning/audits/2026-10-15-user-behavior-ui-logic-audit.md: on /orders, pressing Esc in the cancel-reason dialog closes the order drawer behind it but leaves the dialog open; 'Xác nhận hủy' then silently does nothing (no request, no toast), so staff believe the order was cancelled while it stays PENDING and can still be dispatched. Fix with regression tests."
created: 2026-10-16
updated: 2026-10-16
branch: fix/cancel-dialog-escape
---

# Debug Session: Cancel Dialog Escape

## Symptoms

Source: audit-reviewer-verified #11 (UI-7) (raw: `.planning/audits/2026-10-15-raw/01-ui-logic-auditor.md`).

- **Expected:** Esc in the cancel-reason dialog closes only the dialog (the order drawer stays open with the order). Whenever the drawer closes, the dialog closes too. "Xác nhận hủy" never becomes a dead button: it either cancels the order or the dialog is gone.
- **Actual (from code reading):**
  - `src/components/ui/drawer.tsx:49-52` — a document-level `keydown` listener calls `onClose()` on Escape, regardless of a dialog on top.
  - `src/app/orders/page.tsx:287-289`, `:298-300` — the drawer close clears `selectedOrderId`; `showCancelDialog` stays true.
  - `:307` `if (!selectedOrderId) return;` in `updateOrderStatus`; `:874` the dialog's confirm calls `updateOrderStatus('CANCELLED', cancelReason)` → returns silently.
- **Reproduction:** /orders → "Xem / In" on an order → choose "Đã hủy" → reason dialog → press Esc → drawer closes, dialog stays → type a reason → "Xác nhận hủy" → nothing happens.
- Note: since #96 the status change sends `expectedStatus`; keep that behaviour.

## Constraints

- Web only. Smallest correct change: e.g. the dialog handles Esc itself (close dialog, stop propagation / the drawer ignores Esc while a dialog is open) and closing the drawer also closes the dialog. Check whether other screens use `Drawer` with dialogs on top and keep their behaviour correct.
- Tests: Playwright on throwaway local Postgres via `scripts/e2e-local.sh` (guard `e2e/support/env.ts`; `E2E_BROWSER_CHANNEL=chrome` if needed), e.g. in `e2e/order-lifecycle.spec.ts`: choose Đã hủy, press Escape → dialog hidden, drawer still open (or both closed) — never a visible dialog with no order; then cancelling via the dialog still works. Never the Supabase DB in `.env`.
- Gates: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, the new/related e2e (`order-lifecycle`, `order-races`, `order-drawer`).
- Conventional Commits, one logical change each.

## Current Focus

- hypothesis: the drawer's document-level Esc handler calls handleCloseDrawer (setSelectedOrderId(null)) while the cancel dialog is open; showCancelDialog/cancelReason are not reset, so the dialog stays and its confirm hits `if (!selectedOrderId) return`
- test: e2e in e2e/order-lifecycle.spec.ts — choose Đã hủy, type a reason, press Escape; expect dialog hidden and drawer visible, then cancel through the dialog
- expecting: RED — dialog stays visible, drawer hidden
- next_action: none — resolved; branch ready for PR into dev
- tdd_checkpoint:
    test_file: e2e/order-lifecycle.spec.ts
    test_name: "cancelling from the order drawer › Esc in the reason dialog closes it, and the order can still be cancelled"
    status: green
    failure_output: |
      ✘ 6 [chromium] › e2e/order-lifecycle.spec.ts:153:7 › cancelling from the order drawer › Esc in the reason dialog closes it, and the order can still be cancelled (15.8s)
      Error: expect(locator).toBeHidden() failed
      Locator:  getByRole('heading', { name: 'Lý do hủy đơn hàng' })
      Expected: hidden
      Received: visible
      > 167 |     await expect(reasonTitle).toBeHidden();
      (aria snapshot at failure: only the reason dialog; no "Chi tiết đơn hàng" drawer)
- reasoning_checkpoint:
    hypothesis: "Esc reaches the Drawer's document keydown listener, which calls handleCloseDrawer → selectedOrderId=null; showCancelDialog stays true, so the dialog is left over a closed drawer and its confirm returns early in updateOrderStatus"
    confirming_evidence:
      - "RED e2e: after Esc the reason heading is still visible and the drawer dialog is gone from the aria snapshot"
      - "drawer.tsx calls onClose() on any Escape; handleCloseDrawer only clears selectedOrderId; updateOrderStatus starts with `if (!selectedOrderId) return`"
    falsification_test: "if, after handleCloseDrawer closes the dialog first, Esc still leaves the dialog open or closes the drawer, the hypothesis is wrong"
    fix_rationale: "handleCloseDrawer is the only drawer-close path reachable while the dialog's full-screen overlay is up; making it close the dialog (and reset the reason) instead of the drawer means the dialog can never outlive the drawer and Esc closes only the top layer"
    blind_spots: "assets page has a similar modal-over-drawer pattern (not changed); Drawer itself unchanged so other screens unaffected

## Evidence

- timestamp: 2026-10-16
  checked: src/components/ui/drawer.tsx
  found: document keydown listener calls onClose() on Escape unconditionally while the drawer is open
  implication: any Esc on the page, wherever focus is (focus stays on the drawer's status select after choosing Đã hủy), closes the drawer
- timestamp: 2026-10-16
  checked: src/app/orders/page.tsx handleCloseDrawer, cancel dialog, updateOrderStatus
  found: handleCloseDrawer only sets selectedOrderId=null; the dialog is rendered outside the drawer gated on showCancelDialog only; updateOrderStatus returns early when selectedOrderId is null
  implication: confirms the silent dead "Xác nhận hủy" mechanism
- timestamp: 2026-10-16
  checked: the dialog overlay (fixed inset-0 z-50) covers the drawer backdrop and its X button
  found: while the dialog is open, Esc is the only path to the drawer's onClose
  implication: making handleCloseDrawer close the dialog first (and only the dialog) fixes the Esc path without touching the shared Drawer
- timestamp: 2026-10-16
  checked: other Drawer users (grep ui/drawer)
  found: src/components/order/order-entry-drawer.tsx (no dialog on top), src/app/assets/page.tsx (Add/Record modals; the Record modal is gated on `showRecord && selected`, so Esc closes drawer and hides the modal, but showRecord is not reset — latent, out of scope)
  implication: a change local to orders/page.tsx leaves the other Drawer screens unchanged
- timestamp: 2026-10-16
  checked: RED run `E2E_BROWSER_CHANNEL=chrome scripts/e2e-local.sh order-lifecycle` (local Docker Postgres)
  found: 5 passed, new test failed at `expect(reasonTitle).toBeHidden()` — Received: visible; drawer absent from aria snapshot
  implication: bug reproduced exactly as reported
- timestamp: 2026-10-16
  checked: GREEN run `E2E_BROWSER_CHANNEL=chrome scripts/e2e-local.sh order-lifecycle order-races order-drawer print-slip` after the fix
  found: 18 passed (16.9s), including the new test; order-races #96 expectedStatus tests still pass
  implication: fix confirmed, no regression on the order screens
- timestamp: 2026-10-16
  checked: gates
  found: lint exit 0 (0 errors, 65 pre-existing warnings; none added in the touched files), typecheck exit 0, npm test 309/309 pass, npm run build exit 0 (local throwaway DATABASE_URL)
  implication: ready for PR

## Eliminated

## Resolution

- root_cause: The shared Drawer closes on any Escape via a document keydown listener. On /orders its onClose (handleCloseDrawer) only cleared selectedOrderId, while the cancel-reason dialog, rendered outside the drawer and gated only on showCancelDialog, stayed open. Its "Xác nhận hủy" then called updateOrderStatus, which returns early when selectedOrderId is null: no request, no toast, order stays PENDING.
- fix: handleCloseDrawer in src/app/orders/page.tsx closes the cancel dialog (and clears cancelReason) when it is open, instead of closing the drawer. The dialog's full-screen overlay covers the drawer's backdrop and X button, so Esc is the only drawer-close path while it is open; the dialog can no longer outlive the selected order. Drawer component unchanged; expectedStatus (#96) untouched.
- verification: New e2e (e2e/order-lifecycle.spec.ts › cancelling from the order drawer) RED before the fix (reason heading still visible after Esc, drawer gone), GREEN after; it also checks the reason is reset and the order is cancelled through the dialog afterwards ([HỦY: ...] note, status CANCELLED). order-lifecycle, order-races, order-drawer, print-slip: 18/18 pass. lint/typecheck/test (309)/build all pass.
- files_changed: [src/app/orders/page.tsx, e2e/order-lifecycle.spec.ts]
- follow_up (not done, out of scope): src/app/assets/page.tsx shows the "Ghi nhận bảo trì" modal on `showRecord && selected`; Esc closes the drawer (selected=null) and hides the modal but leaves showRecord true, so it reappears when another asset is opened.
