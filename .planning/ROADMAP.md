# Roadmap: IceFlow SaaS

## Milestones

- ✅ **v1.0 MVP** — Core order entry + delivery (shipped 2026-04-16)
- ✅ **v2.0 Multi-tenant Factory Architecture** — Phases 01-04 (shipped 2026-04-21)
- 🚧 **vNext** — Next milestone (not yet planned)

---

## Phase 01: Foundation — Data Layer + Factory Model + Super Admin Role

**Goal:** Build the cross-cutting data layer that enables multi-tenancy, introduce the Factory model, and add the SUPER_ADMIN role.

**Requirements:** DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, FACT-03, SADM-01
**Plans:** 2/2 complete ✓

---

## Phase 02: Factory Registration + Subscription Core

**Goal:** Enable new factories to self-register with a trial subscription; block write operations when subscription is inactive or expired.

**Requirements:** FACT-01, FACT-02, SUB-01, SUB-02, SUB-03
**Plans:** 2/2 complete ✓

---

## Phase 03: Subscription Management + Super Admin Dashboard

**Goal:** Complete subscription billing workflow and build the Super Admin dashboard.

**Requirements:** SUB-04, SUB-05, SADM-02, SADM-03, SADM-04, SADM-05
**Plans:** 3/3 complete ✓

---

## Phase 04: Integration — Factory-Scoped v1.0 Features + Grace Period

**Goal:** Ensure all v1.0 features work within factory-scoped model; implement 7-day grace period.

**Requirements:** INT-01, INT-02, INT-03, INT-04, INT-05, FACT-04
**Plans:** 3/3 complete ✓

---

## Summary

| Phase | Requirements | Key Deliverables |
|-------|-------------|-----------------|
| 01 | DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, FACT-03, SADM-01 | factoryId data layer, Factory model, SUPER_ADMIN role |
| 02 | FACT-01, FACT-02, SUB-01, SUB-02, SUB-03 | Factory registration, trial subscription, subscription enforcement |
| 03 | SUB-04, SUB-05, SADM-02, SADM-03, SADM-04, SADM-05 | Payment confirmation, VietQR, Super Admin dashboard |
| 04 | INT-01, INT-02, INT-03, INT-04, INT-05, FACT-04 | v1.0 factory-scoped integration, 7-day grace period |
| **Total** | **24 requirements** | |

**Archive:** [.planning/milestones/v2.0-ROADMAP.md](.planning/milestones/v2.0-ROADMAP.md)

---

*Last updated: 2026-04-22 after v2.0 milestone completion*