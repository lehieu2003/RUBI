# Quick Task 261011-mci: CI riêng cho app di động

**Date:** 2026-10-11
**Nguồn:** User: mọi thay đổi trong `mobile/` chạy CI mobile khi push hay merge; phần web chạy riêng. Hiện CI chỉ có cổng web, và nó chạy cho cả thay đổi chỉ nằm trong `mobile/` mà không kiểm tra dòng Flutter nào.

## Task 1 — Workflow

**Files:** `.github/workflows/mobile.yml`, `.github/workflows/ci.yml`
- `mobile.yml`: chạy khi PR hoặc push vào `dev`/`master` có thay đổi dưới `mobile/**`; `flutter pub get`, `flutter analyze`, `flutter test`; kiểm tra tên nhánh và commit như cổng web.
- `ci.yml`: bỏ qua thay đổi chỉ nằm trong `mobile/**`.

## Task 2 — Quy tắc

**Files:** `CLAUDE.md`, `AGENTS.md`
- Quy tắc merge nêu thêm cổng "Mobile Quality Gate".

## Verify

Các bước của `mobile.yml` chạy ở máy; cả hai workflow chạy trên PR này.
