---
phase: quick
plan: "260416-opw"
status: complete
completed: 2026-04-16
---

# Quick Task 260416-opw: Fix deliveryGps Schema Mismatch

## Problem
`GET /api/orders/map` returned 500 error: `Unknown argument 'deliveryGps'`

## Root Cause
- Prisma schema had `deliveryLat Float?` and `deliveryLng Float?` fields
- API code (confirm route, map route) used `deliveryGps Json?` field
- Schema and API were out of sync

## Fix
Added `deliveryGps Json? @map("delivery_gps")` to Order model in schema.prisma

## Verification
- `PATCH /api/orders/[id]/confirm` with GPS data: `{"success":true,"deliveryGps":{"lat":10.8231,"lng":106.6297}}`
- `GET /api/orders/map` returns orders with GPS: `[{"id":"...","deliveryGps":{"lat":10.8231,"lng":106.6297}...}]`

## Commit
`702536f` - fix: add deliveryGps Json field to Order model
