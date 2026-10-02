# Testing

## Framework

Tests run on Node's built-in runner (`node:test` + `node:assert/strict`) via `tsx` — no external framework.

```bash
npm test          # runs tests/run-tests.ts (import manifest of all suites)
```

## Structure

- `tests/run-tests.ts` — import manifest; every new test file must be added here.
- Two kinds of suites:
  1. **Source-pattern checks** (most files): `readFileSync` + `assert.match` against the source of routes/components — they pin security/behavior invariants (e.g. `requireRole` usage, factory scoping, webhook fail-closed guard).
  2. **Unit tests** (pure functions): e.g. `unwrapEnvelope`, `buildCsv`, `isSubscriptionActive` — imported and executed directly.

## Conventions

- New test file → add its import to `tests/run-tests.ts`.
- CI (`.github/workflows/ci.yml`) runs lint → typecheck → test → build; the suite must stay green.
- When a test's expectation conflicts with an intentional code change, update the test in the same commit as the code (see `docs/e2e-bug-report-2026-10-02.md` for the triage history).
