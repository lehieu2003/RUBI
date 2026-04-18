---
name: "260418-ddj-unify-toast-system"
description: "Unify toast system: global ToastContext provider, replace per-page useToast boilerplate with global toast() function"
type: quick
date: 2026-04-18
quick_id: 260418-ddj
---

## Goal

Unify the toast notification system so all pages use a single global `toast()` function instead of each page managing its own `useToast()` state.

## Problems

- Each page (`dashboard-client`, `vehicles`, `customers`, `deposits/shells`) calls `useToast()` and manages its own toast state
- `ToastContainer` is placed in each page independently
- Pages that don't include toast show no notifications even if actions succeed elsewhere

## Solution

1. Add `ToastProvider` to root layout — wraps entire app with toast state
2. Export global `toast()` function from `toast.tsx` — no hook needed
3. Remove per-page `useToast()` boilerplate from all 4 pages
4. `ToastContainer` lives in root layout only

## Tasks

### Task 1: Update toast.tsx — add global toast function

**File:** `src/components/dashboard/toast.tsx`

**Action:**
- Add `createContext` / `useContext` for global toast state
- Export `ToastProvider` component wrapping the existing `ToastContainer`
- Export `toast()` function via `useToaster()` hook (singleton pattern)
- Keep existing `ToastContainer` + `useToast` for backward compatibility

**Verify:** `toast()` can be called from any component without local state

### Task 2: Add ToastProvider to root layout

**File:** `src/app/layout.tsx`

**Action:**
- Import `ToastProvider` from toast.tsx
- Wrap children with `<ToastProvider>`

**Verify:** ToastContainer renders globally (check dev tools)

### Task 3: Clean up dashboard-client.tsx

**File:** `src/components/dashboard/dashboard-client.tsx`

**Action:**
- Remove `useToast` import
- Remove `const { toasts, addToast, dismissToast } = useToast()` line
- Remove `<ToastContainer toasts={toasts} onDismiss={dismissToast} />`

**Verify:** Page still shows (no toast logic needed on dashboard itself — quick actions pass toast through other mechanisms)

### Task 4: Clean up vehicles/page.tsx

**File:** `src/app/vehicles/page.tsx`

**Action:**
- Remove `useToast` import
- Remove `useToast()` call
- Remove `<ToastContainer>`
- Change all `addToast(...)` calls to `toast(...)`

**Verify:** Add driver → success toast still fires

### Task 5: Clean up customers/page.tsx

**File:** `src/app/customers/page.tsx`

**Action:**
- Remove `useToast` import
- Remove `useToast()` call
- Remove `<ToastContainer>`
- Change all `addToast(...)` calls to `toast(...)`

**Verify:** Add customer → success toast still fires

### Task 6: Clean up deposits/shells/page.tsx

**File:** `src/app/deposits/shells/page.tsx`

**Action:**
- Remove `useToast` import
- Remove `useToast()` call
- Remove `<ToastContainer>`
- Change all `addToast(...)` calls to `toast(...)`

**Verify:** Add transaction → success toast still fires

## done

- toast() called from any component without local state
- ToastContainer in root layout only
- All 4 pages clean of toast boilerplate
- BUILD passes
