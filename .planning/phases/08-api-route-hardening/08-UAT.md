---
status: testing
phase: 08-api-route-hardening
source:
  - 08-01-SUMMARY.md
  - 08-02-SUMMARY.md
  - 08-03-SUMMARY.md
  - 08-04-SUMMARY.md
  - 08-05-SUMMARY.md
started: 2026-04-22T00:00:00+07:00
updated: 2026-04-22T00:00:00+07:00
---

## Current Test

number: 1
name: Inactive Subscription Blocks Order Writes
expected: |
  With a factory whose subscription is inactive or expired, attempting an order write such as bulk assign, status update, or reconciliation returns a 403 subscription error and does not modify the order.
awaiting: user response

## Tests

### 1. Inactive Subscription Blocks Order Writes
expected: With a factory whose subscription is inactive or expired, attempting an order write such as bulk assign, status update, or reconciliation returns a 403 subscription error and does not modify the order.
result: [pending]

### 2. Active Subscription Allows Order Writes
expected: With an active subscription, authorized ADMIN or ACCOUNTANT users can still bulk assign, update order status, and reconcile delivered orders normally.
result: [pending]

### 3. Customer, Driver, and Staff Writes Respect Subscription
expected: Customer creation, driver creation, staff creation, staff update, and staff delete are blocked when subscription is inactive and still work for authorized ADMIN users when active.
result: [pending]

### 4. Pricing, Subscription, Deposit, and Onboarding Writes Respect Subscription
expected: Global price changes, customer price overrides, subscription update/cancel, shell deposit updates, and onboarding completion all require an active subscription before writing data.
result: [pending]

### 5. Payment Confirmation Creates Audit Record
expected: Confirming a payment as ADMIN extends the subscription and creates a Payment audit record with factory, admin, amount, confirmation time, and subscription reference in notes.
result: [pending]

### 6. Accountant Can Read Billing Subscription
expected: ACCOUNTANT users can load billing subscription status and driver count, while unauthorized roles remain forbidden.
result: [pending]

### 7. VietQR Template Formats Payment Details
expected: VietQR display helpers produce bank/account/holder/amount/note content, mask long account numbers for display, and generate a stable payment note with the factory name and subscription prefix.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps

[none yet]
