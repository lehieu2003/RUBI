---
phase: quick
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - "src/app/orders/page.tsx"
autonomous: true
requirements: []
---

<objective>
Update orders page to fetch from /api/orders API instead of hardcoded fake data
</objective>

<context>
@src/app/api/orders/route.ts
@src/app/orders/page.tsx

The API returns orders with customer and orderItems relations. The page currently uses fakeOrders (hardcoded array with driver field). Need to:
1. Replace fake data with useEffect fetching from /api/orders
2. Map API response to match UI expectations
3. Handle loading/error states
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace hardcoded fakeOrders with API fetch</name>
  <files>src/app/orders/page.tsx</files>
  <read_first>
    - src/app/orders/page.tsx
    - src/app/api/orders/route.ts
  </read_first>
  <action>
Read the file, then replace the hardcoded fakeOrders, fakeCustomers, fakeProducts arrays and the filteredOrders logic with:

1. Add useState for orders, loading, error
2. Add useEffect to fetch from /api/orders on mount
3. Replace filteredOrders with filtered version of the fetched orders
4. For "driver" field (not in DB): use a placeholder "Anh Vinh" or omit since DB doesn't track driver
5. Keep all UI components the same - only data source changes

The API returns orders with structure:
{
  id, code, status, total, notes, createdAt,
  customer: { id, code, name, address, phone },
  orderItems: [{ id, quantity, unitPrice, lineTotal, product: { id, name, sizeKg } }]
}

For items display: join orderItems.map(i => `${i.product.name} ${i.product.sizeKg}kg × ${i.quantity}`).join(', ')

For customer: order.customer.name
For customer code: order.customer.code
For createdAt: format as HH:MM from createdAt date
</action>
  <verify>
    <automated>grep -l "useEffect.*api/orders" src/app/orders/page.tsx && ! grep -l "const fakeOrders" src/app/orders/page.tsx</automated>
  </verify>
  <done>Orders page fetches from /api/orders API instead of hardcoded fakeOrders</done>
  <acceptance_criteria>
    - No hardcoded fakeOrders array in the file
    - useEffect fetches from /api/orders
    - Orders display with customer name, items, total, status
    - Loading state handled
    - Error state handled
  </acceptance_criteria>
</task>

</tasks>

<success_criteria>
1. src/app/orders/page.tsx fetches from /api/orders instead of using fakeOrders
2. All UI elements (status badges, filters, table) work with API data
</success_criteria>

<output>
After completion, create SUMMARY.md in task directory
</output>
