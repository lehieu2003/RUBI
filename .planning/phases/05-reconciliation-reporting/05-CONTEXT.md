# Phase 5: Reconciliation & Reporting - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Accountant confirms delivered quantities from paper slips returned by drivers at day end. System auto-deducts confirmed quantities from inventory. Customer debt balance updates automatically. Owner sees daily debt report with all outstanding balances. System tracks shell/bag deposits owed by each customer separately.

This phase delivers: confirmation workflow, inventory deduction, debt update logic, daily debt report, shell deposit tracking.

</domain>

<decisions>
## Implementation Decisions

### Partial Delivery Handling
- **D-01:** Line-item actualQty — Each OrderItem records both `quantity` (ordered) and `actualQty` (confirmed delivered). Accountant enters actualQty per line item during reconciliation. Order total recalculates from actualQty × unitPrice. Debt = Σ(actualQty × unitPrice). Audit trail preserved: ordered vs delivered per line item.
- **D-02:** When actualQty < quantity — Debt is reduced proportionally. No separate "return" entry needed for Phase 5; the debt reduction IS the adjustment.

### Debt vs Deposit Tracking
- **D-03:** Two separate models — CustomerDebtLedger (for ice payments/credit) and CustomerShellDeposit (for shell bag tracking). Separate ledgers, separate reports. Clean accounting separation — debt is money owed for goods, shell deposits are refundable liabilities.

### Debt Ledger Model
- **D-04:** CustomerDebtLedger entries — Each delivery creates a DEBT entry (negative balance impact). Each payment creates a PAYMENT entry (positive balance). Running balance computed from ledger entries.
- **D-05:** Balance = Σ(PAYMENT entries) - Σ(DEBT entries). Outstanding debt = current balance owed.

### Debt Report Structure
- **D-06:** Outstanding balance per customer — One row per customer showing: customer name, total outstanding debt, last payment date. Simple and scannable. Owner sees at a glance who to chase.
- **D-07:** No transaction history in Phase 5 — only current outstanding balance per customer. Transaction history deferred to future phase.

### Shell/Deposit Workflow
- **D-08:** Manual shell tracking — Track shells borrowed per customer (count + deposit value per shell). Warehouse staff manually records shell in/out. Simple UI for warehouse staff to record: customer ID, shells borrowed/returned, date.
- **D-09:** Shell deposit balance — Per-customer: shellsBorrowed count, depositPerShell value, totalDepositValue. CustomerShellDeposit model tracks: customerId, shellsOut (positive = owed to customer), shellsIn (positive = owed to factory), depositPerShell, netDepositOwed.
- **D-10:** Deposit tracking is independent of debt tracking — A customer can owe money for ice but still have deposits from shells. Both tracked separately.

### Confirmation Workflow
- **D-11:** Accountant workflow — Office staff collects paper slips returned by drivers at end of day. Accountant opens confirmation screen, sees all DELIVERED orders. Accountant enters actualQty per line item from paper slip. On confirm → status updates to COMPLETED + inventory auto-deducts.
- **D-12:** Status transition — DELIVERED → COMPLETED. No status reversal in Phase 5 (corrections handled manually by admin).

### Inventory Deduction
- **D-13:** Auto-deduct on COMPLETED — When accountant confirms delivery, system auto-deducts actualQty from Product inventory. New Inventory model: ProductId, date, quantityOnHand.
- **D-14:** No inventory forecasting or low-stock alerts in Phase 5 — just tracking current on-hand quantity.

### Data Model Changes
- **D-15:** OrderItem gets new field: `actualQty Int?` (nullable — null means not yet reconciled)
- **D-16:** New model: `CustomerDebtLedger` — id, customerId, type (DEBT/PAYMENT), amount, notes, createdAt
- **D-17:** New model: `CustomerShellDeposit` — id, customerId, shellsOut, shellsIn, depositPerShell, createdAt, updatedAt
- **D-18:** New model: `Inventory` — id, productId, date, quantityOnHand

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documents
- `.planning/PROJECT.md` — Core constraint: Speed over everything, web-only, roles: ACCOUNTANT (confirm deliveries), OWNER (debt reports)
- `.planning/REQUIREMENTS.md` — Phase 5 requirements: INVD-01 through INVD-07
- `.planning/ROADMAP.md` — Phase 5 goal: Reconciliation, inventory deduction, debt report, shell deposit tracking

### Prior Phase Context
- `.planning/phases/01-foundation-order-entry/01-CONTEXT.md` — Phase 1 decisions: Order model, status enum (PENDING/SHIPPING/DELIVERED/COMPLETED/CANCELLED)
- `.planning/phases/02-delivery-slips/02-CONTEXT.md` — Phase 2: print flow, confirmation flow
- `.planning/phases/03-driver-delivery-view/03-CONTEXT.md` — Phase 3: DELIVERED = driver confirmed + GPS; COMPLETED = accountant reconciliation
- `.planning/phases/04-status-enum-fixes/04-CONTEXT.md` — Phase 4: status enum fixes

### Code References
- `prisma/schema.prisma` — OrderItem model (needs actualQty field), existing Order/Customer/Product/Driver models
- `src/app/api/orders/[id]/confirm/route.ts` — Driver confirmation endpoint (DELIVERED status + GPS)
- `src/app/api/orders/route.ts` — Orders API (extend with status filter for reconciliation)

### No external specs — requirements fully captured in decisions above

</canonical_refs>

<codebase>
## Existing Code Insights

### Reusable Assets
- Existing Order/OrderItem models via Prisma — extend with actualQty field
- Existing Customer model — add debt ledger relation
- Existing API routes pattern — new endpoints for reconciliation, debt report
- Existing UI components from dashboard — card layouts, tables, status badges

### Established Patterns
- Prisma for data access (already in use)
- Zod for request validation (already in use)
- API routes for REST endpoints (already established)
- Role-based access (ADMIN/ACCOUNTANT/STAFF) from PROJECT.md

### Integration Points
- PATCH /api/orders/[id]/confirm — currently sets DELIVERED, needs extension point for actualQty entry
- New GET /api/orders/reconcile — fetch DELIVERED orders awaiting reconciliation
- New PATCH /api/orders/[id]/reconcile — submit actualQty per line item, update to COMPLETED, trigger inventory deduction + debt ledger entry
- New GET /api/reports/debt — outstanding debt per customer
- New GET /api/deposits/shells — shell deposit status per customer
- New PATCH /api/deposits/shells — record shell in/out transaction
- Dashboard sidebar needs links: Reconciliation, Debt Report, Deposit Tracking

</codebase>

<specifics>
## Specific Ideas

1. **Paper slip workflow** — Accountant receives physical slips from drivers. Each slip has handwritten actual quantities. Accountant enters into system one by one.

2. **Debt is real money** — In Vietnamese ice factory culture, customer debt (công nợ) is a relationship tool. Owners extend credit to good customers. The system tracks it so they know who has been paying slowly vs. not at all.

3. **Shell deposits can be significant** — A factory with 100 shells at 50,000 VND each = 5,000,000 VND in deposits. This is real money that must be tracked carefully.

4. **Phase 5 is the accounting phase** — This is where the system becomes a real business tool, not just order entry. Speed is less critical here (accountant works at their own pace), but accuracy is paramount.

</specifics>

<deferred>
## Deferred Ideas

### Transaction History (belongs in Phase 5 future extension)
- Full debt ledger with per-entry dates and notes — deferred to future phase after Phase 5 basic flow works

### Shell barcode/QR tracking (belongs in Phase 5+)
- Per-shell barcode tracking — requires hardware + workflow change, too complex for Phase 5

### Inventory alerts (belongs in Phase 5+)
- Low stock warnings — deferred after basic inventory tracking is working

### Per-customer payment history view (belongs in Phase 5+)
- Detail view showing all debt entries and payments per customer — deferred after basic outstanding balance report is working

</deferred>

---

*Phase: 05-reconciliation-reporting*
*Context gathered: 2026-04-16*
