# Production Deployment Plan — IceFlow SaaS trên VPS (Docker + nginx + Supabase)

> **For agentic workers:** Đây là runbook triển khai — các task là thao tác hạ tầng với lệnh + điểm verify cụ thể, không phải code TDD. Thực hiện tuần tự từ trên xuống; mỗi task chặn task sau khi verify fail.

**Goal:** Đưa IceFlow SaaS lên production thật: user xưởng đá dùng được qua HTTPS, data trên Supabase, có backup/monitor/rollback.

**Architecture:** `Internet → nginx :443 (SSL, proxy) → Next.js standalone :3000 (Docker) → Supabase Postgres (pooler) + Redis (rate-limit)`. App image build trực tiếp trên VPS từ git clone (solo dev — không cần registry). Email qua Resend. Cron chạy trên VPS cho email cảnh báo hết hạn.

**Tech Stack:** VPS Ubuntu 24.04 · Docker + Compose v2 · nginx + certbot · Supabase Postgres · Redis 7 · Resend · DNS A record.

**Spec:** Báo cáo bảo mật + audit trong `docs/e2e-bug-report-2026-10-02.md`. Quy ước IP: app chỉ bind localhost, mọi traffic public qua nginx.

## Chi phí dự kiến hàng tháng

| Hạng mục | Chi phí |
|---|---|
| VPS 2 vCPU / 2GB RAM / 40GB (VinaHost, Viettel, Contabo VN-region) | ~200–350k VND/tháng |
| Domain (.vn hoặc .com) | ~300–500k VND/năm |
| Supabase Free (500MB) → Pro $25/tháng khi vượt | 0 → $25 |
| Resend | Free (100 email/ngày — dư cho app này) |
| Redis (chạy chung VPS trong docker-compose) | 0 |

## Global Constraints

- **Không bao giờ** commit `.env.production` vào git; secret chỉ sống trên VPS.
- App + redis chạy trong docker-compose; nginx chạy **trên host** (không docker) để certbot đơn giản.
- Mọi mật khẩu production sinh bằng `openssl rand -base64 24` — không dùng mật khẩu dev.
- Sau mỗi task: chạy verify step, thất bại thì dừng và rollback trước khi đi tiếp.
- DB production là Supabase — mọi schema thay đổi chỉ qua `prisma migrate deploy`, không `db push`.

---

### Task 0: Chuẩn bị phía local (trước khi đụng VPS)

**Files:** không đổi code; chỉ kiểm tra + tạo secret.

- [ ] **0.1 Đồng bộ migration**: `npx prisma migrate dev --name sync-prod` trên local DB — nếu "already in sync" không tạo gì là tốt; có tạo thì commit migration mới. Verify: `ls prisma/migrations/` khớp schema.
- [ ] **0.2 Build production check**: `npm run build` phải PASS sạch (batch trước đã fix toàn bộ type errors).
- [ ] **0.3 Sinh secret** (lưu vào password manager):
  ```bash
  openssl rand -base64 32   # JWT_SECRET
  openssl rand -base64 32   # PAYMENT_WEBHOOK_SECRET
  openssl rand -base64 18   # superadmin password production
  ```
- [ ] **0.4 Quyết định DB production**: dùng Supabase project hiện có (data đã có) — xác nhận bằng cách đếm factories trên dashboard Supabase. Tách `DATABASE_URL` (pooler, port 6543, pgbouncer=true) và `DIRECT_URL` (port 5432) cho migration.
- [ ] **0.5 Mua domain** (MatBao/Porkbun/Namecheap — khuyên `.com` hoặc `.vn`). Verify: dashboard registrar hiện domain Active.
- [ ] **0.6 Đăng ký Resend** → verify domain (thêm DNS records Resend yêu cầu sau khi có domain) → lấy `RESEND_API_KEY`.

### Task 1: VPS cơ bản

- [ ] **1.1 Tạo VPS** Ubuntu 24.04, 2vCPU/2GB/40GB, key SSH (không password). Verify: `ssh root@IP` vào được.
- [ ] **1.2 Hardening hệ điều hành**:
  ```bash
  adduser iceflow && usermod -aG sudo iceflow
  rsync --archive --chown=iceflow:iceflow ~/.ssh /home/iceflow
  apt update && apt upgrade -y
  apt install -y ufw fail2ban unattended-upgrades
  ufw default deny incoming && ufw allow OpenSSH && ufw allow 80,443/tcp && ufw enable
  systemctl enable --now fail2ban
  ```
  Verify: `ufw status` = allow 22/80/443; SSH bằng user iceflow; login root bị deny.
- [ ] **1.3 Cài Docker + Compose plugin** (official script):
  ```bash
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker iceflow
  ```
  Verify: `docker run hello-world` (đăng xuất vào lại) OK.
- [ ] **1.4 Trỏ DNS**: A record `@` và `api` (nếu tách) → IP VPS. Verify: `dig +short yourdomain.com` = IP VPS.
- [ ] **1.5 Cài nginx + certbot**:
  ```bash
  apt install -y nginx certbot python3-certbot-nginx
  ```
  Verify: `curl http://yourdomain.com` trả welcome page nginx.

### Task 2: Cấu hình nginx (reverse proxy)

**Files:** `/etc/nginx/sites-available/iceflow`, enable symlink.

- [ ] **2.1 Tạo config**:
  ```nginx
  server {
    listen 80;
    server_name yourdomain.com;
    client_max_body_size 10M;
    location / {
      proxy_pass http://127.0.0.1:3000;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
  ```
- [ ] **2.2 SSL**: `certbot --nginx -d yourdomain.com` (auto redirect 443 + renew timer). Verify: `curl -I https://yourdomain.com` có `Strict-Transport-Security` (header từ next.config đã thêm ở batch 4) và chứng chỉ Let's Encrypt.
- [ ] **2.3 Bật TRUSTED_PROXY_IPS trong env của app**: `TRUSTED_PROXY_IPS=127.0.0.1` (nginx local) — rate-limit sẽ nhận đúng IP khách từ `X-Forwarded-For`.

### Task 3: Deploy app lên VPS

**Files:** `.env.production` trên VPS (không commit), `docker-compose.yml` đã có sẵn postgres+redis+app — production chỉ chạy **redis + app** (DB là Supabase).

- [ ] **3.1 Tạo `docker-compose.prod.yml`** trên VPS (hoặc thêm vào repo, khuyến nghị commit file này vì không chứa secret):
  ```yaml
  services:
    app:
      build: { context: ., target: runner }
      restart: unless-stopped
      ports: ['127.0.0.1:3000:3000']
      env_file: .env.production
      depends_on:
        redis: { condition: service_healthy }
    redis:
      image: redis:7-alpine
      restart: unless-stopped
      healthcheck: { test: ['CMD', 'redis-cli', 'ping'], interval: 5s }
  ```
  (bỏ service postgres — DB là Supabase).
- [ ] **3.2 Clone repo + tạo `.env.production`**:
  ```
  NODE_ENV=production
  DATABASE_URL=<supabase pooler 6543, pgbouncer=true>
  DIRECT_URL=<supabase direct 5432>
  JWT_SECRET=<từ 0.3>
  PAYMENT_WEBHOOK_SECRET=<từ 0.3>
  RESEND_API_KEY=<từ 0.6>
  REDIS_URL=redis://redis:6379
  TRUSTED_PROXY_IPS=127.0.0.1
  ```
  `chmod 600 .env.production`.
- [ ] **3.3 Chạy migration vào Supabase prod**: lịch sử migrate cũ không replay được (shadow-db fail) — áp dụng file SQL trực tiếp: `prisma/migrations/20261002234613_add_asset_management/migration.sql` qua Supabase SQL Editor (hoặc psql với DIRECT_URL). Verify: bảng `assets` + `maintenance_records` tồn tại.
- [ ] **3.4 Seed system factory + superadmin**: `npx tsx prisma/seed-system-factory.ts` (env SUPER_ADMIN_EMAIL + SUPER_ADMIN_PASSWORD mạnh từ 0.3 — **không dùng 12345678**). Verify: login superadmin qua UI được.
- [ ] **3.5 Build + up**: `docker compose -f docker-compose.prod.yml up -d --build`. Verify: `docker compose ps` healthy; `curl -s http://127.0.0.1:3000/login -o /dev/null -w '%{http_code}'` = 200 từ trong VPS.
- [ ] **3.6 Smoke test qua HTTPS**: `https://yourdomain.com` load; login superadmin; tạo 1 factory test; tạo 1 đơn; in phiếu K80 từ Chrome máy thật; đăng ký 1 factory mới bằng email thật (nhận email Resend).

### Task 4: Webhook ngân hàng thật

- [ ] **4.1 Đăng ký webhook trên SePay/Casso** trỏ tới `https://yourdomain.com/api/webhooks/payment` + set secret trùng `PAYMENT_WEBHOOK_SECRET`.
- [ ] **4.2 Chuyển khoản thử 10.000đ đúng nội dung** → Verify: Payment record trong Supabase + subscription +30 ngày + toast/email. (Đã verify logic ở local — đây là verify path ngân hàng → HTTPS thật.)

### Task 5: Cron vận hành

- [ ] **5.1 Cron email cảnh báo hết hạn** (hiện email chỉ gửi khi user login — thiếu tự động): thêm endpoint nội bộ `GET /api/cron/subscription-warnings` (protected bằng header secret) + crontab VPS `0 8 * * * curl -s -H "Authorization: Bearer <cron-secret>" https://yourdomain.com/api/cron/subscription-warnings`. Gửi email cho factory sắp hết hạn (3 ngày/1 ngày) — dùng sẵn `sendTrialWarningEmail` trong `src/lib/email/service.ts`. **(Đây là item code duy nhất trong plan.)**
- [ ] **5.2 Backup Supabase**: bật scheduled backups trên Supabase dashboard (Pro) hoặc crontab `pg_dump` nightly vào `/var/backups`. Verify: file backup tồn tại + restore thử 1 lần vào DB dev.

### Task 6: Monitor + Runbook

- [ ] **6.1 Health endpoint**: thêm `GET /api/health` trả `{ ok: true, db: 'up' }` (1 query nhẹ) — dùng cho UptimeRobot/cron healthcheck.
- [ ] **6.2 UptimeRobot** free monitor `https://yourdomain.com/api/health` mỗi 5 phút → alert email.
- [ ] **6.3 Runbook dán vào repo** (`docs/PRODUCTION.md`): các lệnh thường dùng — logs (`docker compose logs -f app`), restart, rollback:
  ```bash
  git checkout <tag-trước> && docker compose -f docker-compose.prod.yml up -d --build
  ```
- [ ] **6.4 Tag release đầu tiên**: `git tag v1.0.0 && git push --tags`.

---

## Rủi ro & thứ tự khuyến nghị

1. **Đừng dùng Supabase dev DB cho prod nếu data thật đã quan trọng** — nếu Supabase hiện tại chứa data chơi (test factories), cân nhắc tạo project Supabase prod mới + migrate + chỉ seed system factory, rồi nhập khách thật từ CSV.
2. Vercel alternative đã loại — nếu sau này đổi ý, Redis phải chuyển Upstash (REDIS_URL đổi endpoint là xong).
3. **Cron 5.1 là item code duy nhất** — làm trước khi khai trương để không bỏ sót email cảnh báo gia hạn (mất doanh thu âm thầm).

## Ước lượng công sức

| Task | Thời gian |
|---|---|
| 0. Chuẩn bị local + mua domain + Resend | 1–2 giờ (chờ DNS/mail verify) |
| 1. VPS + hardening + Docker | 1–2 giờ |
| 2. nginx + SSL | 30 phút |
| 3. Deploy app + smoke | 1–2 giờ |
| 4. Webhook ngân hàng | 1 giờ (chờ chuyển khoản thật) |
| 5. Cron + backup | 1–2 giờ (gồm code 5.1) |
| 6. Monitor + runbook | 1 giờ |
| **Tổng** | **~1 ngày làm việc** |
