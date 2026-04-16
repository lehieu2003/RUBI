# Phase 5: Reconciliation & Reporting - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 05-reconciliation-reporting
**Areas discussed:** Partial Delivery Handling, Debt vs Deposit Tracking, Debt Report Structure, Shell/Deposit Workflow

---

## Area 1: Partial Delivery Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Line-item actualQty | Accountant enters actual qty per line item. Order total recalculates. Each OrderItem gets actualQty field. Preserves audit trail. | ✓ |
| Order-level adjustment | One adjustment amount for the whole order. Simpler but less precise. | |
| Full replacement | Replace ordered qty with actual qty. Debt always = actual delivered. No audit trail. | |

**User's choice:** Line-item actualQty (recommended)
**Notes:** Debt = Σ(actualQty × unitPrice). Preserves ordered vs delivered per line item.

---

## Area 2: Debt vs Deposit Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Two separate models | CustomerDebtLedger (for ice payments) + CustomerShellDeposit (for shell tracking). Two separate ledgers. Cleaner accounting separation. | ✓ |
| Single unified ledger | One CustomerFinancialLedger with type field (DEBT or DEPOSIT). Simpler schema but more complex filtering in UI. | |
| Customer model fields only | Add debtBalance and shellDepositBalance directly to Customer model. Simplest schema but no transaction history. | |

**User's choice:** Two separate models (recommended)
**Notes:** Clean separation — debt is money owed for goods, shell deposits are refundable liabilities.

---

## Area 3: Debt Report Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Outstanding balance per customer | One row per customer: name, total outstanding debt, last payment date. Simple and scannable. | ✓ |
| Transaction history with running balance | Each delivery and payment logged. Running balance per customer. Full audit trail. More complex but comprehensive. | |
| Summary totals only | Total factory debt + total deposits. No per-customer breakdown. Too little detail for actionable follow-up. | |

**User's choice:** Outstanding balance per customer (recommended)
**Notes:** Simple, scannable. Owner chases who to call at a glance.

---

## Area 4: Shell/Deposit Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Manual shell tracking | Track shells borrowed per customer (count + deposit value). Warehouse staff manually records shell in/out. Simple UI, matches current workflow. | ✓ |
| Per-shell barcode/QR | Each shell gets a barcode. Scan in/out at warehouse. Most precise but requires hardware + workflow change. Too complex for Phase 5. | |
| Deposit balance only | Just track deposit payments and refunds per customer. No per-shell count. Simpler but less precise. | |

**User's choice:** Manual shell tracking (recommended)
**Notes:** Warehouse staff records shell movements. Simple UI. Matches current workflow.

---

## Deferred Ideas

- **Transaction history** — Deferred to future phase after Phase 5 basic flow works
- **Shell barcode/QR tracking** — Too complex for Phase 5, deferred
- **Inventory alerts** — Deferred after basic inventory tracking is working
- **Per-customer payment history view** — Deferred after basic outstanding balance report is working
