# Phase 1: Foundation & Order Entry - Research

**Researched:** 2026-04-14
**Domain:** Greenfield Next.js order management system
**Confidence:** MEDIUM-HIGH

## Summary

This is a greenfield Next.js 16 App Router project for ice factory order management with a hard constraint: 30-second order entry. The speed-first requirement drives every technical decision. The stack is Next.js + TypeScript + Drizzle ORM + SQLite (ideal for solo dev deployment) + Zustand for client state. The 3-in-1 search bar and Order Matrix are the two UI centerpiece patterns that require careful keyboard-navigation implementation.

**Primary recommendation:** Next.js App Router (Server Components + Server Actions) + Drizzle + SQLite + Zustand + Tailwind CSS. Use CSS Grid for the Order Matrix and a custom slide-out drawer with focus-trap and keyboard support.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Slide-out Drawer pattern for order entry UI (D-01)
- 3-in-1 "Ultimate Search Bar" with default 10 recent, as-you-type by name/phone/code, auto-single-select (D-02, D-03)
- Grid-based "Order Matrix" with rows=ice types, columns=bag sizes (D-04 to D-07)
- Mixed pricing: Global Base + Customer Override with inheritance (D-08 to D-12)
- 6 fixed SKUs: Đá Bi 5/10/20kg, Đá Viên 5/10/20kg (D-15)

### Claude's Discretion
- ORM and database choice (not specified by user)
- State management library
- Project directory structure
- How to implement keyboard navigation in the order matrix
- Print template implementation approach

### Deferred Ideas (OUT OF SCOPE)
- Phase 2: Delivery slips (print trigger endpoint needed but not built yet)
- Phase 3: Driver View
- Phase 4: Reconciliation

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ORD-01 | Office staff can look up wholesale customer by code and see name instantly | Search bar with instant code lookup |
| ORD-02 | Office staff can add products (ice bags by size) to an order with minimal keystrokes | Order Matrix with Tab/Enter keyboard nav |
| ORD-03 | Order total calculates automatically using customer's negotiated price list | Zustand computed state + mixed pricing inheritance |
| ORD-04 | Office staff can save and retrieve orders by customer or date | Server Actions + Drizzle queries |
| CFG-01 | Products (ice types and bag sizes) can be configured in the system | Product config table + admin UI |
| CFG-02 | Each customer has a price list with negotiated rates per product | Customer override table |
| CFG-03 | Customer records include name, code, address, phone, and price list reference | Customer data model |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.3 | Full-stack framework | App Router, Server Actions, RSC |
| TypeScript | 5.x | Type safety | Catches errors at build time |
| Tailwind CSS | 4.2.2 | Styling | Rapid UI development, consistent design tokens |
| Drizzle ORM | 0.45.2 | Database ORM | Type-safe, lightweight, SQLite-first |
| better-sqlite3 | 12.9.0 | SQLite driver | Synchronous, fast, single-file DB |
| Zustand | 5.0.12 | Client state management | Minimal boilerplate, no re-render issues |
| Zod | 4.3.6 | Schema validation | Runtime type safety for forms |
| Lucide React | 1.8.0 | Icons | Consistent, tree-shakeable SVG icons |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Fuse.js | 7.3.0 | Fuzzy search | Client-side fuzzy matching for search bar |
| cmdk | 1.1.1 | Command menu | Keyboard-navigable dropdown for search results |
| react-to-print | ~3.x | Print integration | Thermal/A5 slip printing |
| @tailwindcss/forms | ~0.5.x | Form styling | Consistent form input styles |

**Installation:**
```bash
npm install next@latest react@latest react-dom@latest typescript @types/node @types/react @types/react-dom tailwindcss@latest postcss autoprefixer drizzle-orm better-sqlite3 @types/better-sqlite3 zustand zod lucide-react fuse.js cmdk react-to-print @tailwindcss/forms
npm install -D drizzle-kit @types/better-sqlite3
```

**Version verification:** All versions verified via `npm view [package] version` on 2026-04-14.

---

## Architecture Patterns

### Recommended Project Structure

```
iceflow/
├── app/
│   ├── layout.tsx              # Root layout (fonts, global providers)
│   ├── page.tsx                # Home: redirects to /orders or shows dashboard
│   ├── orders/
│   │   ├── page.tsx            # Order list view
│   │   └── new/page.tsx        # New order (slide-out drawer on /orders page)
│   ├── customers/
│   │   ├── page.tsx            # Customer list
│   │   └── [id]/page.tsx       # Customer detail + price list
│   ├── products/
│   │   └── page.tsx            # Product config (CFG-01)
│   ├── config/
│   │   └── prices/page.tsx     # Global base prices admin
│   └── api/                    # Route handlers if needed for external access
│       └── print/route.ts
├── components/
│   ├── ui/                     # Generic UI components (Button, Input, etc.)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── drawer.tsx         # Slide-out drawer
│   ├── orders/
│   │   ├── order-drawer.tsx   # Full order entry drawer (client component)
│   │   ├── search-bar.tsx     # Ultimate Search Bar (client component)
│   │   ├── order-matrix.tsx   # Grid matrix for product selection
│   │   └── order-list.tsx     # Order list/table
│   └── customers/
│       └── customer-form.tsx
├── lib/
│   ├── db/
│   │   ├── index.ts           # Drizzle client instance
│   │   ├── schema.ts          # All table definitions
│   │   └── migrations/        # Drizzle migration files
│   ├── store/
│   │   └── order-store.ts     # Zustand store for active order
│   ├── actions/
│   │   └── orders.ts          # Server Actions for order CRUD
│   └── utils/
│       ├── pricing.ts         # Price inheritance logic
│       └── search.ts          # Search utilities
├── drizzle.config.ts
├── tailwind.config.ts
└── next.config.ts
```

### Pattern 1: Server Components + Server Actions (Data Layer)

**What:** Data fetching in Server Components, mutations via Server Actions.

**When to use:** All database reads and writes.

```typescript
// app/orders/page.tsx (Server Component)
import { getOrders } from '@/lib/db/queries';

export default async function OrdersPage() {
  const orders = await getOrders(); // Direct DB call, no API layer
  return <OrderList orders={orders} />;
}

// lib/db/queries.ts
import { db } from './index';
import { orders, customers } from './schema';
import { desc } from 'drizzle-orm';

export async function getOrders() {
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}
```

**Why:** No API round-trip, type safety end-to-end, secrets stay server-side.

### Pattern 2: Zustand for Order Entry State (Client)

**What:** Lightweight state management for the order being built.

**When to use:** Order drawer is open, quantities change in real-time, total must update instantly.

```typescript
// lib/store/order-store.ts
import { create } from 'zustand';
import type { Customer, Product, OrderLineItem } from '@/lib/db/schema';

interface OrderState {
  isOpen: boolean;
  customer: Customer | null;
  lineItems: Map<string, { quantity: number; unitPrice: number }>; // productId -> { qty, price }
  total: number;
  // Actions
  openDrawer: () => void;
  closeDrawer: () => void;
  setCustomer: (customer: Customer) => void;
  setLineItem: (productId: string, quantity: number, unitPrice: number) => void;
  clearOrder: () => void;
  getTotal: () => number;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  isOpen: false,
  customer: null,
  lineItems: new Map(),
  total: 0,

  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false, customer: null, lineItems: new Map(), total: 0 }),

  setCustomer: (customer) => {
    set({ customer });
    // Pre-populate prices based on customer's price list
  },

  setLineItem: (productId, quantity, unitPrice) => {
    const lineItems = new Map(get().lineItems);
    if (quantity <= 0) {
      lineItems.delete(productId);
    } else {
      lineItems.set(productId, { quantity, unitPrice });
    }
    const total = Array.from(lineItems.values()).reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    set({ lineItems, total });
  },

  clearOrder: () => set({ customer: null, lineItems: new Map(), total: 0 }),
  getTotal: () => get().total,
}));
```

**Why Zustand over Context:** Zustand has minimal boilerplate, does not cause re-render cascades, and `create` returns a hook directly. For a 30-second order entry where every keystroke matters, Zustand is faster than Context (no context providers to propagate).

### Pattern 3: Slide-Out Drawer with Focus Trap

**What:** Order entry form slides in from right, overlays order list, closes on save/ESC.

**When to use:** Order entry UX (D-01).

```typescript
// components/ui/drawer.tsx
'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusable = drawer.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first)?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl z-50 flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="drawer-title" className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </>
  );
}
```

### Pattern 4: Order Matrix Grid with Keyboard Navigation

**What:** 6-cell grid (rows=ice types, columns=sizes), Tab navigates cells, Enter confirms order.

**When to use:** Product selection UX (D-04 to D-07).

```typescript
// components/orders/order-matrix.tsx
'use client';

interface OrderMatrixProps {
  products: Product[];         // 6 products
  prices: Map<string, number>; // productId -> unit price for this customer
  values: Map<string, number>; // productId -> quantity
  onChange: (productId: string, qty: number) => void;
  onConfirm: () => void;
}

// Layout: 2 rows (Đá Bi, Đá Viên) x 3 columns (5kg, 10kg, 20kg)
const MATRIX = [
  ['ice-block-5kg', 'ice-block-10kg', 'ice-block-20kg'],
  ['ice-cube-5kg', 'ice-cube-10kg', 'ice-cube-20kg'],
];

export function OrderMatrix({ products, prices, values, onChange, onConfirm }: OrderMatrixProps) {
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  function handleKeyDown(e: React.KeyboardEvent, productId: string) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    }
  }

  return (
    <div role="grid" aria-label="Order products">
      {/* Header row */}
      <div role="row" className="grid grid-cols-4 gap-2 mb-2">
        <div role="columnheader" className="font-medium text-sm text-gray-500" />
        {[5, 10, 20].map(size => (
          <div key={size} role="columnheader" className="text-center text-sm font-medium text-gray-500">
            {size}kg
          </div>
        ))}
      </div>

      {/* Data rows */}
      {['Đá Bi (Block)', 'Đá Viên (Cube)'].map((rowLabel, rowIdx) => (
        <div key={rowLabel} role="row" className="grid grid-cols-4 gap-2 mb-2">
          <div role="rowheader" className="font-medium text-sm flex items-center">
            {rowLabel}
          </div>
          {MATRIX[rowIdx].map(productId => {
            const product = productMap[productId];
            if (!product) return <div key={productId} />;
            const qty = values.get(productId) || 0;
            const price = prices.get(productId) || 0;
            return (
              <div key={productId} role="gridcell">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={qty || ''}
                  onChange={(e) => onChange(productId, parseInt(e.target.value) || 0)}
                  onKeyDown={handleKeyDown}
                  aria-label={`${product.name} ${product.size}kg quantity`}
                  className="w-full text-center px-2 py-3 border rounded focus:ring-2 focus:ring-blue-500"
                  tabIndex={0}
                />
                <div className="text-xs text-center text-gray-500 mt-1">
                  {price > 0 ? `${price.toLocaleString()}đ` : '-'}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

**Keyboard behavior:** `tabIndex={0}` on each input makes them all in the tab order. Natural Tab/Shift+Tab between cells. Enter on any cell triggers order confirmation. Auto-focus first quantity field when customer is selected via `autoFocus` on that input ref.

### Pattern 5: 3-in-1 Search Bar

**What:** Single input with 3 behaviors: (1) empty shows 10 recent, (2) typing filters by name/phone/code simultaneously, (3) single result auto-selects on Enter.

```typescript
// components/orders/search-bar.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, User, Phone } from 'lucide-react';
import Fuse from 'fuse.js';

interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
}

interface SearchBarProps {
  customers: Customer[];       // All customers (from server)
  recentCustomerIds: string[];  // IDs of 10 most recent customers
  onSelect: (customer: Customer) => void;
}

const fuseOptions = {
  keys: ['name', 'phone', 'code'],
  threshold: 0.3,              // Fuzzy tolerance
  includeScore: true,
};

export function SearchBar({ customers, recentCustomerIds, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fuse = useRef(new Fuse(customers, fuseOptions));

  // Default view: 10 most recent customers
  const displayList = query.trim() === ''
    ? customers.filter(c => recentCustomerIds.includes(c.id)).slice(0, 10)
    : results;

  useEffect(() => {
    if (query.trim()) {
      const searchResults = fuse.current.search(query).map(r => r.item);
      setResults(searchResults);
      setSelectedIndex(0);
    }
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    const list = displayList;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, list.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (list[selectedIndex]) onSelect(list[selectedIndex]);
    }
    if (e.key === 'Escape') { setQuery(''); inputRef.current?.blur(); }
  }

  return (
    <div className="relative">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tìm khách hàng (tên, mã, SĐT)..."
          className="w-full pl-10 pr-4 py-3 text-lg border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          autoFocus
        />
      </div>

      {/* Results dropdown */}
      {displayList.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {query.trim() === '' && (
            <li className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">
              <Clock className="inline w-3 h-3 mr-1" /> Khách hàng gần đây
            </li>
          )}
          {displayList.map((customer, idx) => (
            <li
              key={customer.id}
              role="option"
              aria-selected={idx === selectedIndex}
              className={`flex items-center gap-3 px-3 py-3 cursor-pointer ${
                idx === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelect(customer)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{customer.name}</div>
                <div className="text-sm text-gray-500 flex gap-4">
                  <span><span className="font-mono">{customer.code}</span></span>
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</span>
                </div>
              </div>
              {idx === selectedIndex && (
                <span className="text-xs text-blue-600 font-medium">Enter để chọn</span>
              )}
            </li>
          ))}

          {/* Auto-select hint when single result */}
          {query.trim() !== '' && displayList.length === 1 && (
            <li className="px-3 py-2 text-xs text-center text-blue-600 bg-blue-50 border-t">
              Enter để chọn {displayList[0].name}
            </li>
          )}

          {/* No results */}
          {query.trim() !== '' && displayList.length === 0 && (
            <li className="px-3 py-6 text-center text-gray-500">
              Không tìm thấy khách hàng
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
```

### Pattern 6: Print Integration with CSS @media print

**What:** Browser print dialog triggers, CSS hides non-print content and formats slip for A5/thermal.

**When to use:** Delivery slip printing (DLVR-01 to DLVR-04, deferred to Phase 2, but foundation needed now).

```css
/* app/globals.css or print.css */
@media print {
  /* Hide everything except the slip */
  body > *:not(.print-slip) { display: none !important; }

  .print-slip {
    position: absolute;
    left: 0;
    top: 0;
    width: 80mm;  /* Thermal printer width */
    padding: 5mm;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.3;
  }
}
```

```typescript
// components/orders/print-slip.tsx
// Hidden component rendered only when print is triggered
export function OrderSlip({ order }: { order: Order }) {
  return (
    <div className="print-slip" style={{ display: 'none' }}>
      <div className="text-center font-bold text-lg mb-2">{COMPANY_NAME}</div>
      <div className="mb-2">Khách hàng: {order.customer.name}</div>
      <div className="mb-2">Địa chỉ: {order.customer.address}</div>
      <hr className="my-2" />
      {order.lineItems.map(item => (
        <div key={item.productId} className="flex justify-between">
          <span>{item.productName} ({item.size}kg) x{item.quantity}</span>
          <span>{item.total.toLocaleString()}đ</span>
        </div>
      ))}
      <hr className="my-2" />
      <div className="flex justify-between font-bold">
        <span>TỔNG CỘNG:</span>
        <span>{order.total.toLocaleString()}đ</span>
      </div>
      <div className="mt-4">Chữ ký khách hàng: _______________</div>
    </div>
  );
}
```

**Foundation for Phase 2:** Order data model must include all fields needed for printing (customer name, address, line items, totals). The `print-slip` component is built in Phase 1 as a hidden component triggered by the print button (which is wired in Phase 1, printed in Phase 2).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Search fuzzy matching | Custom string similarity algorithm | Fuse.js | Battle-tested, handles Vietnamese transliteration acceptably |
| State management for order form | React Context + useReducer | Zustand | Zustand has no provider boilerplate, direct hook access, minimal re-renders |
| Database ORM | Raw SQL strings | Drizzle ORM | Type-safe schema, migrations, SQLite-first, zero overhead |
| Keyboard navigation in grid | Custom tab-order logic | Native tabIndex + onKeyDown | Browser handles tab order natively, minimal code |
| Price inheritance logic | Manual if/else price lookups | Computed function in pricing utility | Single source of truth, easy to test |

---

## Common Pitfalls

### Pitfall 1: Zustand Store Reinitialization on Server
**What goes wrong:** Zustand store created with `create` runs on server during SSR, state does not persist to client.

**Why it happens:** `create` is called at module level; on server each request gets fresh state, but on client the module is cached and state persists.

**How to avoid:** Always check for `typeof window !== 'undefined'` before accessing browser-only state, or initialize store with `undefined` and populate in a `useEffect`. Better: use `suppressHydrationWarning` and populate in a `useEffect` in the component that opens the drawer.

### Pitfall 2: SQLite in Next.js Edge/Serverless
**What goes wrong:** `better-sqlite3` is a native Node.js module — it does NOT work in Edge Runtime or Vercel Serverless.

**Why it happens:** Edge Runtime uses V8 isolates, not Node.js. Native modules can't be loaded.

**How to avoid:** 
- Use Node.js runtime explicitly for API routes that use SQLite (default in Next.js App Router)
- If deploying to Vercel, use `@vercel/postgres` or `prisma` + `postgres` instead
- For single-server deployment (e.g., a VPS), `better-sqlite3` is fine

### Pitfall 3: Search Bar Focus Trap with Nested Modals
**What goes wrong:** ESC key closes drawer but also triggers other event handlers.

**Why it happens:** Keyboard event propagation when drawer is rendered inside other containers.

**How to avoid:** Call `e.stopPropagation()` on keyDown in drawer, or use `aria-hidden` on background elements.

### Pitfall 4: Order Matrix Tab Order Reads Wrong
**What goes wrong:** Tab order follows DOM order (left-to-right) but user expects row-by-row navigation.

**Why it happens:** Default tab order is source order, not visual grid order. With `grid-cols-4`, a row has 4 cells (1 label + 3 inputs). Natural tab goes through label then 3 inputs, then next row's label then 3 inputs.

**How to avoid:** The pattern above uses `tabIndex={0}` on inputs and natural DOM order. For a 2x3 grid, this is acceptable. For larger grids, implement custom arrow-key navigation similar to combobox pattern.

### Pitfall 5: Type Safety Gap Between Server and Client
**What goes wrong:** Server returns database entity types, client passes them to Zustand, type mismatches cause runtime errors.

**Why it happens:** Drizzle generates types from schema, but serializing to JSON (for crossing RSC boundary) strips `Date` objects and other non-serializable types.

**How to avoid:** Always serialize explicitly: `customer.createdAt.toISOString()` before passing to client. Use `zod` to validate at the boundary.

---

## Code Examples

### Drizzle Schema (Data Model for Phase 1)

```typescript
// lib/db/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),          // 'Đá Bi' or 'Đá Viên'
  sizeKg: integer('size_kg').notNull(), // 5, 10, 20
  unit: text('unit').notNull().default('bag'), // 'bag' or 'block'
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g., 'KH001'
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

export const globalPrices = sqliteTable('global_prices', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  pricePerUnit: real('price_per_unit').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const customerPrices = sqliteTable('customer_prices', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  productId: text('product_id').notNull().references(() => products.id),
  pricePerUnit: real('price_per_unit').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  status: text('status').notNull().default('draft'), // draft | confirmed | printed | delivered
  total: real('total').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  productId: text('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  lineTotal: real('line_total').notNull(),
});
```

### Price Lookup Function (Inheritance)

```typescript
// lib/utils/pricing.ts
import { globalPrices, customerPrices } from '@/lib/db/schema';
import { db } from '@/lib/db';

export async function getPriceForCustomer(
  productId: string,
  customerId: string
): Promise<number> {
  // 1. Check customer override
  const override = await db.query.customerPrices.findFirst({
    where: (cp, { and, eq }) => and(eq(cp.customerId, customerId), eq(cp.productId, productId)),
  });

  if (override) return override.pricePerUnit;

  // 2. Fall back to global base
  const base = await db.query.globalPrices.findFirst({
    where: (gp, { eq }) => eq(gp.productId, productId),
  });

  return base?.pricePerUnit ?? 0;
}

export async function getCustomerPriceList(customerId: string) {
  // Returns Map<productId, price> for all active products
  // with customer override taking precedence over global
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router (`/pages`) | App Router (`/app`) | Next.js 13 (2022) | Server Components, nested layouts, streaming |
| `getServerSideProps` | Server Components direct fetch | Next.js 13 | No data fetching boilerplate |
| REST API for mutations | Server Actions | Next.js 14 | Type-safe, no API layer needed |
| Redux | Zustand / Jotai | ~2022 | Dramatically less boilerplate |
| Prisma | Drizzle ORM | ~2023 | Lighter, SQL-like, better TypeScript |
| CRA | Next.js / Vite | 2020-2023 | Server-side rendering, file routing |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next.js 16.2.3 is the current version | Standard Stack | Next.js 17 may have breaking changes — verify at install time |
| A2 | `better-sqlite3` works for deployment target (VPS/solo server) | Standard Stack | If deploying to Vercel/serverless, must switch to PostgreSQL |
| A3 | SQLite is sufficient for 50-100 orders/day + per-customer pricing | Standard Stack | SQLite handles ~10K orders/day easily; no issue |
| A4 | Fuse.js fuzzy search is acceptable for Vietnamese text | Search UX | May need custom tokenizer for Vietnamese — verify with real data |
| A5 | Staff keyboard navigation experience (Tab/Enter) is learnable | Order Matrix | Speed-first constraint means training time is near-zero; this must work intuitively |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Print template sizing for thermal vs A5**
   - What we know: DLVR-04 requires "A5 paper and thermal printers (80mm)"
   - What's unclear: Should the print template support both, or is there one primary format?
   - Recommendation: Build one template optimized for 80mm thermal (narrower), which also renders acceptably on A5. Use CSS `@page` size hints.

2. **Authentication/authorization for Phase 1**
   - What we know: Single-user/small team; office staff, drivers, accountants, owner
   - What's unclear: Does Phase 1 need role-based access, or is it open access for initial testing?
   - Recommendation: Phase 1 = open access (single deployment). Auth added in future phase.

3. **Vietnamese text and number formatting**
   - What we know: Prices displayed with `đ` suffix, numbers use locale formatting
   - What's unclear: Are there specific Vietnamese business conventions for receipts/slips?
   - Recommendation: Use `Intl.NumberFormat('vi-VN')` for currency, verify with user during first usability test.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified beyond npm packages — project is greenfield with no pre-existing runtime requirements).

---

## Validation Architecture

`nyquist_validation` is explicitly `false` in `.planning/config.json` — validation architecture section omitted.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Phase 1 is open-access (internal tool) |
| V3 Session Management | No | No auth in Phase 1 |
| V4 Access Control | No | No auth in Phase 1 |
| V5 Input Validation | Yes | Zod schemas for all form inputs and Server Action parameters |
| V6 Cryptography | No | No sensitive data in Phase 1 scope |

### Known Threat Patterns for Greenfield Next.js

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via form input | Tampering | Drizzle parameterized queries (no raw SQL) |
| XSS via customer/order data display | Script Injection | Next.js default escaping; React auto-escapes |
| Mass assignment in Server Actions | Tampering | Zod schema validation before DB write |

---

## Sources

### Primary (HIGH confidence)
- Context7 `next` library ID — App Router patterns, Server Components, Server Actions
- Context7 `zustand` library ID — State management API
- Context7 `drizzle-orm` library ID — Schema patterns, query API
- `npm view [package] version` — All version numbers verified 2026-04-14

### Secondary (MEDIUM confidence)
- Next.js official documentation — App Router conventions, file structure
- Tailwind CSS official docs — Grid layout, forms, print utilities

### Tertiary (LOW confidence)
- Community patterns for Vietnamese text fuzzy search — Fuse.js may need tuning for diacritics handling

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via npm registry
- Architecture: HIGH — patterns from official docs + Context7
- Pitfalls: MEDIUM — common patterns identified from Next.js experience, not all verified with tests

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (30 days — Next.js minor versions are stable)
