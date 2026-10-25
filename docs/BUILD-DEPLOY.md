# Build & Deploy

Quy trình build ứng dụng web và mobile (mô hình áp từ project bakery):

```
nhánh công việc ──PR──▶ dev ──release PR──▶ master
        │                │                      │
   CI Quality Gate   CI Quality Gate      build/deploy thật
   + Conventions     + Conventions
   + Branch guard    + Branch guard
```

## Git

- Công việc hằng ngày: `feat/*`, `fix/*`, `refactor/*`, `docs/*`, `test/*`, `chore/*` → PR vào `dev`.
- Bản phát hành: `release/<version>` (hoặc PR `dev → master` trực tiếp) → PR vào `master`.
- Sửa nóng trên master: `hotfix/<slug>` → PR vào `master` (nhớ merge ngược về `dev`).
- PR vào `master` chỉ được mở từ `release/*`, `hotfix/*` hoặc `dev` — CI (`conventions.yml`) chặn; tiêu đề PR phải là Conventional Commit vì nó thành commit message khi squash.
- Push trực tiếp / force push vào `dev`, `master` bị `protected-branch-guard.yml` phát hiện và mở issue.

## CI (GitHub Actions)

| Workflow | Khi nào chạy | Nội dung |
|---|---|---|
| `ci.yml` — Quality Gate | PR/có thay đổi web | lint, typecheck, test, build, kiểm migration, verify API contracts, e2e trình duyệt |
| `mobile.yml` — Mobile Quality Gate | PR/có thay đổi `mobile/` | `flutter analyze`, `flutter test` |
| `conventions.yml` — Conventions | mọi PR | PR vào master chỉ từ `release/*`/`hotfix/*`/`dev`; tiêu đề PR đúng quy ước |
| `protected-branch-guard.yml` | push vào `dev`/`master` | push phải là merge của PR; vi phạm → fail + tự mở issue |

Merge chỉ khi gate của phần bị thay đổi xanh (đụng cả hai thì cả hai phải xanh).

## Web (Next.js)

**Dev:** như README (compose dev với Postgres + Redis, hoặc `npm run dev` với env local).

**Prod trên VPS (Docker):**

1. Trên server: clone repo, tạo `.env` theo `.env.example` với giá trị thật (Supabase, `JWT_SECRET`, `REDIS_URL`…).
2. Build + chạy: `docker compose -f docker-compose.prod.yml up -d --build`
   - Container `migrate` chạy `prisma migrate deploy` trước, `app` chỉ lên khi migrate thành công.
   - `NEXT_PUBLIC_*` được bake vào bundle lúc build qua `args` (đọc từ `.env`) — đổi giá trị này là phải build lại.
3. Đứng trước `app:3000` bằng Nginx/Caddy với HTTPS; đặt tên miền rồi trỏ các thiết bị về đó.

**Prod trên Vercel (thay thế):** import repo vào Vercel, khai báo env từ `.env` (kể cả `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `REDIS_URL` — Redis cần instance hosted, ví dụ Upstash), framework Next.js nhận tự động. Sau khi có URL, ghi nó vào `mobile/config/prod.json`.

## Mobile (Flutter)

Môi trường build chọn lúc compile bằng flavor file:

| File | FLAVOR | API_BASE_URL |
|---|---|---|
| `mobile/config/dev.json` | `dev` | `http://10.0.2.2:3001` (alias emulator) |
| `mobile/config/prod.json` | `prod` | URL web thật — **sửa trước khi build prod** |

```bash
cd mobile

# Dev (mặc định không cần gì thêm vẫn trỏ về emulator)
flutter run --dart-define-from-file=config/dev.json

# APK release cho tài xế / nhân viên
flutter build apk --release --dart-define-from-file=config/prod.json
```

An toàn có sẵn trong code:

- Không có define → luôn là `dev`; không bao giờ tự thành prod ngầm.
- Bản `prod` thiếu `API_BASE_URL` (hoặc vẫn là URL dev) → app ném lỗi ngay khi mở, không chạy "im lặng" sai máy.
- Bản `dev` hiển thị ruy băng **DEV** góc màn hình để không nhầm APK dev với bản cài cho người dùng thật.
