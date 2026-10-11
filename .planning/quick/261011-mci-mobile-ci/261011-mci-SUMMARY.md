---
status: complete
---

# Quick Task 261011-mci Summary: CI riêng cho app di động

**Date:** 2026-10-11 · **Branch:** `chore/mobile-ci` · **Status:** complete ✓

## Shipped

1. **`Mobile CI` / "Mobile Quality Gate"** (`.github/workflows/mobile.yml`): chạy khi PR hoặc push vào `dev`/`master` đụng tới `mobile/**`. Các bước: kiểm tra tên nhánh và commit, Flutter 3.47.5, `flutter pub get`, `flutter analyze`, `flutter test`.
2. **Cổng web bỏ qua thay đổi chỉ nằm trong `mobile/` và `.planning/`** (`paths-ignore`). Mọi task đều ghi vào `.planning/`; nếu không bỏ qua thì PR mobile nào cũng vẫn chạy cổng web.
3. **Quy tắc merge** trong `CLAUDE.md` và `AGENTS.md` nêu cả hai cổng.

| Thay đổi | Cổng web | Cổng mobile |
|---|---|---|
| Chỉ `mobile/**` | không | chạy |
| Chỉ phần còn lại | chạy | không |
| Cả hai | chạy | chạy |

## Verification

- Ở máy: `flutter analyze` không có vấn đề, `flutter test` qua; hai file YAML đọc được.
- Trên PR: xem kết quả hai workflow trong PR.

## Ghi chú

- Repo không bật branch protection nên một cổng không chạy không chặn merge; nếu sau này bật "required checks" thì phải tính tới việc cổng bị bỏ qua theo đường dẫn.
- Chưa build APK trong CI (cần JDK và lâu hơn nhiều).
- Phiên bản Flutter ghi thẳng trong workflow; đổi phiên bản của app thì đổi cả ở đó.
