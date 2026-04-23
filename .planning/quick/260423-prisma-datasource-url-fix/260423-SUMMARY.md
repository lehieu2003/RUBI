---
status: complete
date: 2026-04-23
---

# Quick Task 260423: Prisma Datasource URL Fix - Summary

## Changes

- Updated `prisma/schema.prisma` datasource to use `DATABASE_URL` plus `directUrl = env("DIRECT_URL")`.
- Forced `/api/billing/subscription` to run on the Node.js runtime so Prisma does not run through Edge/WASM engine paths.
- Added required database variables to `.env.example`.

## Verification

- `npx prisma validate` passed.
- `npx prisma generate` passed and regenerated Prisma Client v6.19.3.
- Direct `PrismaClient.$connect()` smoke test passed.
