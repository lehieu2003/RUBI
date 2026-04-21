---
phase: 03
slug: subscription-management-super-admin-dashboard
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-18
---

# Phase 03 — UI Design Contract

> Visual and interaction contract for Phase 03: Subscription Management + Super Admin Dashboard

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none (manually created components) |
| Icon library | lucide-react |
| Font | System font stack (Segoe UI, sans-serif) |

### Existing Components to Reuse

- `src/components/dashboard/stat-card.tsx` — StatCard with glassmorphism
- `src/components/dashboard/sidebar.tsx` — Collapsible sidebar with role-based nav
- `src/components/dashboard/subscription-status-card.tsx` — Subscription display
- `src/components/billing/payment-recorder.tsx` — Payment recording (existing)
- `src/components/billing/viet-qr-code.tsx` — VietQR display (existing)
- `src/components/ui/drawer.tsx` — Right-side drawer panel

---

## Spacing Scale

Declared values (multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding |
| sm | 8px | Compact element spacing |
| md | 16px | Default element spacing |
| lg | 24px | Section padding |
| xl | 32px | Layout gaps |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page-level spacing |

**Exceptions:** None — follow standard scale strictly.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px | 400 (normal) | 1.5 |
| Label | 12px | 500 (medium) | 1.4 |
| Heading | 18px (page), 16px (section) | 600 (semibold) | 1.3 |
| Display | 24px (page header) | 800 (black) | 1.2 |
| Small | 11px | 400 | 1.4 |

**Vietnamese Localization:** Use `vi-VN` locale for number/currency formatting.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Background (dominant) | `#0f172a` (slate-900) | Page background, main surfaces |
| Surface (secondary) | `#1e293b` (slate-800) | Cards, sidebar, elevated surfaces |
| Surface subtle | `rgba(255,255,255,0.05)` | Card backgrounds, overlays |
| Border | `rgba(255,255,255,0.1)` | Card borders, dividers |
| Accent primary | Blue-500 `#3b82f6` | Primary actions, active states |
| Accent secondary | Violet-600 `#7c3aed` | Gradient partner, decorative |
| Text primary | `#f8fafc` (slate-50) | Headings, primary content |
| Text secondary | `#94a3b8` (slate-400) | Labels, secondary content |
| Text muted | `#64748b` (slate-500) | Placeholders, hints |
| Success | Emerald-500 `#10b981` | Active status, positive trends |
| Warning | Amber-500 `#f59e0b` | Trial warnings, cautions |
| Destructive | Red-500 `#ef4444` | Destructive actions only |

**Accent reserved for:** Primary CTAs, active nav items, success indicators. Never use for all interactive elements.

**Background Effects:**
- Gradient overlays: `from-blue-600/10 to-violet-600/10`
- Grid overlay: 60px grid at 2% opacity for depth
- Card hover: `group-hover:bg-white/10` with shadow glow

---

## Copywriting Contract

### Admin Billing Page (`/billing`)

| Element | Copy |
|---------|------|
| Page title | "Thanh toán" |
| Subscription status label | "Subscription" |
| Plan type value | `{planType}` (e.g., "trial", "basic", "premium") |
| Status: active | "Đang hoạt động" |
| Status: warning | "Trial còn `{days}` ngày — Liên hệ Admin để nâng cấp" |
| Status: inactive | "Hết hạn — Chỉ đọc" |
| Driver count label | "Drivers" |
| Driver count value | `{count} / {max}` |
| CTA: Record payment | "Ghi nhận thanh toán" |

### Super Admin Dashboard (`/admin/dashboard`)

| Element | Copy |
|---------|------|
| Page title | "Quản lý thuê bao" |
| Empty state heading | "Chưa có nhà máy nào" |
| Empty state body | "Các nhà máy sẽ xuất hiện khi họ đăng ký sử dụng IceFlow." |
| Table column: Factory | "Nhà máy" |
| Table column: Status | "Trạng thái" |
| Table column: Plan | "Gói" |
| Table column: Drivers | "Tài xế" |
| Table column: Days left | "Còn lại" |
| Table column: Actions | "Thao tác" |
| Row action: Activate | "Kích hoạt" |
| Row action: Deactivate | "Tắt" |
| Row action: Extend | "Gia hạn" |
| Row action: Edit price | "Sửa giá" |
| Extend input placeholder | "Số ngày (mặc định: 30)" |
| Confirm extend | "Xác nhận" |
| Cancel action | "Hủy" |
| Success toast | "Đã gia hạn {days} ngày cho {factory}" |
| Error toast | "Không thể thực hiện. Vui lòng thử lại." |

---

## Component Specifications

### 1. Super Admin Tenant Table

**Layout:** Full-width responsive table with horizontal scroll on mobile.

**Columns:**

| Column | Width | Alignment | Sortable |
|--------|-------|-----------|----------|
| Factory name | flex-1 | left | yes |
| Status | 120px | center | yes |
| Plan type | 100px | center | yes |
| Driver count | 80px | center | yes |
| Days remaining | 100px | center | yes |
| Actions | 180px | right | no |

**Row styling:**
- Background: `bg-white/5` default, `hover:bg-white/10` on row hover
- Border: `border-b border-white/10`
- Padding: `px-4 py-3`

**Status badges:**
- Active: `bg-emerald-500/20 text-emerald-400`
- Trial: `bg-amber-500/20 text-amber-400`
- Inactive: `bg-red-500/20 text-red-400`

**Row actions:** Button group with ghost/small variants. Inline inputs appear below action row on Extend click.

### 2. Inline Extend Input

**Trigger:** Click "Extend" button in row.

**Appearance:**
- Number input appears below the row's action buttons
- Default value: 30
- Inline confirm/cancel buttons
- Width: 120px for input

**States:**
- Default: `border-white/20 bg-white/5`
- Focus: `border-blue-500 ring-1 ring-blue-500`
- Error: `border-red-500`

### 3. Admin Billing Page Layout

**Structure:**

```
Page header: "Thanh toán" (24px font-black)
├── SubscriptionStatusCard (full width)
├── PaymentRecorder component
└── VietQRCode component
```

**Card layout:**
- StatCard structure with `rounded-2xl border border-white/10 bg-white/5`
- Internal sections separated by `border-t border-white/10`

### 4. Breadcrumb / Page Navigation

For `/admin/dashboard`:
- Back link to dashboard using Lucide `ArrowLeft` icon
- Text: "Quay lại Tổng quan"

---

## Interaction Patterns

### Table Row Actions

1. **Activate:** Single click → immediate API call → optimistic UI update → toast confirmation
2. **Deactivate:** Single click → immediate API call → optimistic UI update → toast confirmation
3. **Extend:** Click → inline input appears → enter days → click confirm OR press Enter → API call → close input
4. **Edit price:** Opens inline edit in driverCount column area → blur or Enter confirms

### Toast Notifications

- Success: Emerald background with white text
- Error: Red background with white text
- Auto-dismiss: 4 seconds
- Position: Bottom-right (consistent with existing toast pattern)

### Loading States

- Table rows: Skeleton loaders with `animate-pulse`
- Buttons: Disable during API call, show spinner if action takes >500ms

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| lucide-react | Icon components only | Not required — used throughout |
| Tailwind CSS v4 | All styling | Not required |

**Note:** No shadcn components. All components manually created following existing patterns.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

---

## Design Notes

1. **Super Admin vs Admin distinction:** Super Admin (`/admin/dashboard`) manages all factories system-wide. Admin (`/billing`) manages their own factory's subscription only.

2. **Role-based access:**
   - `/billing` — ADMIN only
   - `/admin/dashboard` — SUPER_ADMIN only
   - Redirect unauthorized users to `/dashboard`

3. **Consistency with Phase 02:** Follow the same glassmorphism card patterns, sidebar navigation, and dark theme established in existing dashboard.

4. **Mobile considerations:** Tenant table scrolls horizontally on mobile. Billing page stacks vertically.
