/**
 * Checks a RUNNING server against the contracts in src/lib/contracts.
 *
 *   BASE_URL=http://localhost:3000 npm run contract:verify
 *
 * Signs in as the seeded manager, staff and driver, calls every endpoint at
 * least once and validates each response body against its contract: missing
 * or mistyped fields fail, and so do fields the contract does not mention.
 *
 * With `--record` the real responses are saved as fixtures under
 * api/openapi/fixtures/responses/{success,empty,error}/.
 *
 * It CREATES AND CHANGES DATA (customers, shifts, an order is delivered and
 * reconciled), so it only runs against a local server with seeded demo data.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { apiContracts, ErrorResponse, type ApiContract } from '../src/lib/contracts';

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const PASSWORD = process.env.CONTRACT_PASSWORD ?? '12345678';
const ACCOUNTS = {
  admin: process.env.CONTRACT_ADMIN_EMAIL ?? 'quanly@rubi.local',
  staff: process.env.CONTRACT_STAFF_EMAIL ?? 'nhanvien@miendong.vn',
  driver: process.env.CONTRACT_DRIVER_EMAIL ?? 'taixe1@miendong.vn',
};

type Actor = keyof typeof ACCOUNTS | 'anon' | 'newStaff';
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const RECORD = process.argv.includes('--record');
const FIXTURE_DIR = 'api/openapi/fixtures/responses';
const recorded = new Set<string>();

/** Hides secrets and keeps long lists short so a fixture stays readable. */
function sanitize(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.slice(0, 2).map((item) => sanitize(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Json).map(([name, item]) => [name, sanitize(item, name)]));
  }
  if (typeof value === 'string') {
    if (key === 'token') return '<token>';
    if (/password/i.test(key)) return '<password>';
    if (key === 'link') return value.replace(/\/d\/.+$/, '/d/<token>');
  }
  return value;
}

function record(kind: 'success' | 'empty' | 'error', name: string, fixture: Json) {
  if (!RECORD || recorded.has(`${kind}/${name}`)) return;
  recorded.add(`${kind}/${name}`);
  mkdirSync(`${FIXTURE_DIR}/${kind}`, { recursive: true });
  writeFileSync(`${FIXTURE_DIR}/${kind}/${name}.json`, JSON.stringify(sanitize(fixture), null, 2) + '\n');
}

const tokens: Partial<Record<Actor, string>> = {};
const covered = new Set<string>();
const failures: string[] = [];
let checks = 0;

/** Keys present in the response but absent from the parsed (schema-shaped) value. */
function undeclaredKeys(actual: unknown, parsed: unknown, path = 'body'): string[] {
  if (Array.isArray(actual) && Array.isArray(parsed)) {
    return actual.flatMap((item, index) => undeclaredKeys(item, parsed[index], `${path}[${index}]`)).slice(0, 5);
  }
  if (actual && parsed && typeof actual === 'object' && typeof parsed === 'object') {
    return Object.keys(actual).flatMap((key) =>
      key in (parsed as Json)
        ? undeclaredKeys((actual as Json)[key], (parsed as Json)[key], `${path}.${key}`)
        : [`${path}.${key}`]
    );
  }
  return [];
}

function contractOf(id: string): ApiContract {
  const contract = apiContracts.find((item) => item.id === id);
  if (!contract) throw new Error(`Unknown contract id: ${id}`);
  return contract;
}

type CallOptions = {
  as?: Actor;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  /** Expect this error status instead of the success response */
  expectError?: number;
  /** Record this success response as an "empty collection" fixture */
  empty?: boolean;
  headers?: Record<string, string>;
};

async function call(id: string, options: CallOptions = {}): Promise<Json> {
  const contract = contractOf(id);
  const actor = options.as ?? 'admin';
  let path = contract.path;
  for (const [key, value] of Object.entries(options.params ?? {})) {
    path = path.replace(`{${key}}`, encodeURIComponent(value));
  }
  const query = new URLSearchParams(options.query ?? {}).toString();
  const label = `${contract.method} ${path}${query ? `?${query}` : ''} [${id} as ${actor}]`;

  // The request we send must itself satisfy the contract.
  for (const [name, schema, value] of [
    ['params', contract.params, options.params],
    ['query', contract.query, options.query ?? {}],
    ['body', contract.body, options.body],
  ] as const) {
    if (schema && !(name === 'params' && !value) && options.expectError === undefined) {
      const result = (schema as z.ZodType).safeParse(value);
      if (!result.success) failures.push(`${label}: request ${name} does not match the contract: ${result.error.issues[0]?.message}`);
    }
  }

  const headers: Record<string, string> = { ...options.headers };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokens[actor];
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}${query ? `?${query}` : ''}`, {
    method: contract.method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const json = (await response.json().catch(() => null)) as Json;
  checks += 1;
  const fixture = {
    operationId: id,
    request: {
      method: contract.method,
      path: contract.path,
      as: actor,
      ...(options.params ? { params: options.params } : {}),
      ...(options.query ? { query: options.query } : {}),
      ...(options.body !== undefined ? { body: options.body } : {}),
    },
    status: response.status,
    body: json,
  };

  if (options.expectError !== undefined) {
    if (response.status !== options.expectError) {
      failures.push(`${label}: expected status ${options.expectError}, got ${response.status}`);
    } else if (!contract.errors.includes(response.status)) {
      failures.push(`${label}: status ${response.status} is not listed in the contract's errors`);
    }
    if (!ErrorResponse.safeParse(json).success) {
      failures.push(`${label}: error body does not match the error contract: ${JSON.stringify(json).slice(0, 120)}`);
    }
    covered.add(id);
    record('error', `${id}.${response.status}`, fixture);
    return json ?? {};
  }

  const expected = contract.successStatus ?? 200;
  if (response.status !== expected) {
    failures.push(`${label}: expected status ${expected}, got ${response.status} ${JSON.stringify(json).slice(0, 160)}`);
    return json ?? {};
  }
  const result = contract.response.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    failures.push(`${label}: response does not match the contract at ${issue?.path.join('.')}: ${issue?.message}`);
  } else {
    const extra = undeclaredKeys(json, result.data);
    if (extra.length > 0) failures.push(`${label}: response has fields the contract does not declare: ${extra.join(', ')}`);
  }
  covered.add(id);
  record(options.empty ? 'empty' : 'success', id, fixture);
  return json ?? {};
}

const data = (json: Json) => json?.data ?? json;
const pad = (value: number) => String(value).padStart(2, '0');

/** Walks the paginated order list and checks it against the totals and the filters. */
async function verifyOrderPagination() {
  const expect = (condition: unknown, message: string) => {
    if (!condition) failures.push(`pagination: ${message}`);
  };
  const list = (query: Record<string, string>) => call('listOrders', { query });

  // Walking every page yields every order exactly once, newest first.
  const limit = 2;
  const seen: Json[] = [];
  let meta: Json = {};
  for (let page = 1; ; page += 1) {
    const response = await list({ page: String(page), limit: String(limit) });
    meta = response.meta;
    expect(meta.page === page && meta.limit === limit, `page ${page} reports meta ${JSON.stringify(meta)}`);
    expect(response.data.length <= limit, `page ${page} has ${response.data.length} rows for limit ${limit}`);
    expect(page === meta.total_page || response.data.length === limit, `page ${page} is not full but is not the last`);
    seen.push(...response.data);
    if (page >= meta.total_page) break;
    if (page > 500) throw new Error('pagination did not terminate');
  }
  expect(seen.length === meta.total_item, `walked ${seen.length} orders but total_item is ${meta.total_item}`);
  expect(new Set(seen.map((order) => order.id)).size === seen.length, 'an order appears on two pages');
  expect(
    seen.every((order, index) => index === 0 || seen[index - 1].createdAt >= order.createdAt),
    'orders are not sorted newest first across pages'
  );

  // The default page size, and the boundaries of `limit`.
  const defaults = await list({});
  expect(defaults.meta.page === 1 && defaults.meta.limit === 20, `defaults are ${JSON.stringify(defaults.meta)}`);
  const one = await list({ limit: '1' });
  expect(one.data.length === Math.min(1, one.meta.total_item) && one.meta.total_page === one.meta.total_item, 'limit=1');
  const most = await list({ limit: '200' });
  expect(most.meta.limit === 200 && most.data.length === Math.min(200, most.meta.total_item), 'limit=200');
  const invalid: Array<Record<string, string>> = [{ limit: '201' }, { limit: '0' }, { limit: 'abc' }, { page: '-1' }, { page: '1.5' }];
  for (const bad of invalid) {
    await call('listOrders', { query: bad, expectError: 400 });
  }

  // Filters apply before paging: totals per status equal the counters, and every row matches.
  const counts = data(await call('getOrderCounts'));
  expect(counts.total === meta.total_item, `counters total ${counts.total}, list total ${meta.total_item}`);
  let sum = 0;
  for (const [status, count] of Object.entries(counts.byStatus as Record<string, number>)) {
    const filtered = await list({ status, limit: '200' });
    expect(filtered.meta.total_item === count, `status ${status}: list ${filtered.meta.total_item}, counter ${count}`);
    expect(filtered.data.every((order: Json) => order.status === status), `status ${status}: a row has another status`);
    sum += count;
  }
  expect(sum === counts.total, 'the per-status counters do not add up to the total');

  const unassigned = await list({ driverId: 'unassigned', limit: '200' });
  expect(unassigned.data.every((order: Json) => order.driverId === null), 'driverId=unassigned returned an assigned order');
  const unassignedCounts = data(await call('getOrderCounts', { query: { driverId: 'unassigned' } }));
  expect(unassignedCounts.total === unassigned.meta.total_item, 'counters ignore the driver filter');

  // Search by the displayed order code finds exactly that order; an unknown term finds nothing.
  const sample = seen[0];
  const byCode = await list({ q: `#DH-${String(sample.id).slice(-6).toUpperCase()}` });
  expect(byCode.data.some((order: Json) => order.id === sample.id), 'search by order code did not find the order');
  const byName = await list({ q: sample.customer.name.slice(0, 5).toUpperCase(), limit: '200' });
  expect(byName.data.some((order: Json) => order.id === sample.id), 'search by customer name is not case-insensitive');
  const nothing = await list({ q: 'khong-co-don-nao-nhu-vay' });
  expect(nothing.meta.total_item === 0 && nothing.meta.total_page === 0 && nothing.data.length === 0, 'unknown search term');

  // A date far in the past has no orders; today's orders are a subset of all orders.
  const past = await list({ date: '2000-01-01' });
  expect(past.meta.total_item === 0, 'date=2000-01-01 returned orders');
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const today = await list({ date: now.toISOString().slice(0, 10), limit: '200' });
  expect(today.meta.total_item <= meta.total_item, "today's orders exceed all orders");
}

async function main() {
  const host = new URL(BASE_URL).hostname;
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error(`Refusing to run against ${host}: this script changes data. Use a local server with seeded demo data.`);
  }
  const unique = Date.now().toString(36);
  if (RECORD) rmSync(FIXTURE_DIR, { recursive: true, force: true });

  // ---- Auth ----
  await call('health', { as: 'anon' });
  for (const actor of ['admin', 'staff', 'driver'] as const) {
    const login = await call('login', { as: 'anon', body: { email: ACCOUNTS[actor], password: PASSWORD } });
    tokens[actor] = data(login).token;
    if (!tokens[actor]) throw new Error(`Cannot sign in as ${actor} (${ACCOUNTS[actor]}). Is the database seeded?`);
  }

  // The login route allows 5 attempts per account per minute.
  const newEmail = `hopdong-${unique}@rubi.local`;
  const created = data(
    await call('createStaff', { body: { name: 'Nhân viên hợp đồng', email: newEmail, password: 'tamthoi2026', role: 'STAFF' } })
  ).user;
  const newLogin = await call('login', { as: 'anon', body: { email: newEmail, password: 'tamthoi2026' } });
  tokens.newStaff = data(newLogin).token;
  await call('login', { as: 'anon', body: { email: ACCOUNTS.admin, password: 'sai-mat-khau-1' }, expectError: 401 });

  await call('me');
  await call('me', { as: 'anon' });
  await call('refreshSession');
  await call('refreshSession', { as: 'anon', expectError: 401 });

  // ---- Factory ----
  const factory = data(await call('getFactory')).factory;
  await call('updateFactory', {
    body: {
      name: factory.name,
      phone: factory.phone ?? '',
      address: factory.address ?? '',
      maxStaffPerShift: factory.maxStaffPerShift,
      maxDriversPerShift: factory.maxDriversPerShift,
    },
  });
  await call('getFactory', { as: 'staff', expectError: 403 });

  // ---- Customers, products, prices, inventory, shells ----
  const customers = data(await call('listCustomers'));
  await call('listCustomers', { query: { countOnly: 'true' } });
  const customer = data(
    await call('createCustomer', { body: { code: `CT-${unique}`, name: 'Khách kiểm tra hợp đồng', address: 'Đắk Nông', phone: '0900000000' } })
  );
  await call('createCustomer', { body: { name: 'Thiếu mã' }, expectError: 400 });
  await call('createCustomer', { body: { code: `CT-${unique}`, name: 'Trùng mã' }, expectError: 409 });
  await call('exportCustomerDebt');
  await call('exportCustomerDebt', { as: 'staff', expectError: 403 });
  const products = data(await call('listProducts', { as: 'staff' }));
  await call('setGlobalPrice', { body: { productId: products[0].id, price: 12000 } });
  await call('setCustomerPrice', { body: { customerId: customer.id, productId: products[0].id, price: 11000 } });
  await call('removeCustomerPrice', { query: { customerId: customer.id, productId: products[0].id } });
  await call('getInventory');
  await call('getInventory', { as: 'staff', expectError: 403 });
  await call('recordInventory', { body: { productId: products[0].id, quantity: 1, mode: 'ADD' } });
  await call('recordInventory', { body: { productId: products[0].id, quantity: -1 }, expectError: 400 });
  await call('updateShellDeposit', { body: { customerId: customers[0].id, shellsOut: 1 } });
  await call('listShellDeposits');
  await call('getDebtReport');

  // ---- Orders: assign -> ship -> driver confirms -> reconcile ----
  const drivers = data(await call('listDrivers'));
  const orders = data(await call('listOrders'));
  await call('listOrders', { as: 'anon', expectError: 401 });
  await call('listOrders', { query: { status: 'PENDING' } });
  const firstPage = await call('listOrders', { query: { page: '1', limit: '2' } });
  if (firstPage.meta?.limit !== 2 || firstPage.data.length > 2 || firstPage.meta.total_page !== Math.ceil(firstPage.meta.total_item / 2)) {
    failures.push(`listOrders: page=1&limit=2 returned ${firstPage.data?.length} rows with meta ${JSON.stringify(firstPage.meta)}`);
  }
  const secondPage = await call('listOrders', { query: { page: '2', limit: '2' } });
  if (secondPage.data.some((row: Json) => firstPage.data.some((other: Json) => other.id === row.id))) {
    failures.push('listOrders: page 2 repeats rows of page 1');
  }
  await call('listOrders', { query: { page: '9999', limit: '2' }, empty: true });
  await call('listOrders', { query: { limit: '1000' }, expectError: 400 });
  await call('listOrders', { query: { page: '0' }, expectError: 400 });
  await call('listOrders', { query: { date: '10/10/2026' }, expectError: 400 });
  await call('listOrders', { query: { driverId: 'unassigned', q: orders[0].customer.name.slice(0, 4) } });
  const totals = data(await call('getOrderCounts'));
  if (totals.total !== firstPage.meta.total_item) {
    failures.push(`getOrderCounts: total ${totals.total} differs from the list's total_item ${firstPage.meta.total_item}`);
  }
  await call('getOrderCounts', { as: 'driver', expectError: 403 });
  await verifyOrderPagination();
  const driver = drivers[0];
  const order = orders.find((item: Json) => item.status === 'PENDING') ?? orders.find((item: Json) => item.status === 'SHIPPING');
  if (!driver || !order) throw new Error('Seed data must contain a driver and a PENDING or SHIPPING order.');
  await call('bulkAssignOrders', { body: { orderIds: [order.id], driverId: driver.id } });
  await call('updateOrderStatus', { params: { id: order.id }, body: { status: 'SHIPPING' } });
  await call('updateOrderStatus', { params: { id: order.id }, body: { status: 'COMPLETED' }, expectError: 400 });
  await call('listDriverOrders', { as: 'driver' });
  await call('listDriverOrders', { as: 'anon', expectError: 401 });
  const settle = { items: order.orderItems.map((item: Json) => ({ id: item.id, actualQty: item.quantity })) };
  await call('reconcileOrder', { params: { id: 'khong-ton-tai' }, body: settle, expectError: 404 });
  await call('reconcileOrder', { params: { id: order.id }, body: settle, expectError: 409 }); // still SHIPPING
  await call('confirmDelivery', { as: 'anon', params: { id: order.id }, expectError: 401 });
  await call('confirmDelivery', { as: 'staff', params: { id: order.id }, expectError: 403 });
  await call('confirmDelivery', { as: 'driver', params: { id: order.id } });
  await call('reconcileOrder', { params: { id: order.id }, body: { items: [{ id: 'dong-la', actualQty: 1 }] }, expectError: 400 });
  await call('reconcileOrder', { params: { id: order.id }, body: settle });

  // ---- Accounts ----
  const users = data(await call('listStaff')).users;
  await call('createStaff', { body: { name: 'Trùng', email: newEmail, password: 'tamthoi2026', role: 'STAFF' }, expectError: 409 });
  await call('updateStaff', { params: { id: created.id }, body: { name: 'Nhân viên hợp đồng (đã sửa)' } });
  await call('updateStaff', { params: { id: created.id }, body: { role: 'ADMIN' }, expectError: 400 });
  await call('createStaff', { body: { name: 'Sai email', email: 'khong-phai-email', password: 'tamthoi2026', role: 'STAFF' }, expectError: 400 });
  await call('createDriver', { body: {}, expectError: 405 });

  // The new account sets its own password (it is flagged mustChangePassword).
  const changed = await call('changePassword', {
    as: 'newStaff',
    body: { currentPassword: 'tamthoi2026', newPassword: 'rieng2026abc' },
  });
  tokens.newStaff = data(changed).token;
  await call('deactivateStaff', { params: { id: created.id } });

  // ---- Schedule, shift report, payroll lock (in a month far enough ahead) ----
  const future = new Date(Date.now() + 70 * 86400000);
  const month = `${future.getUTCFullYear()}-${pad(future.getUTCMonth() + 1)}`;
  const day = `${month}-15`;
  // A month nobody has shifts in, for the empty-report fixture.
  const emptyMonth = `${future.getUTCFullYear() + 5}-01`;
  const weekStart = `${month}-13`;
  const staffUser = users.find((user: Json) => user.email === ACCOUNTS.staff);

  await call('setPayrollLock', { body: { month, locked: false } });
  await call('getShiftReport', { query: { month: emptyMonth }, empty: true });
  await call('listScheduleAssignments', { query: { week: weekStart } });
  await call('listScheduleAssignments', { query: { week: 'abc' }, expectError: 400 });
  await call('saveScheduleAssignment', { body: { userId: staffUser.id, shiftDate: day, shift: 'SLOT_06_09' } });
  await call('saveScheduleAssignmentPatch', {
    body: { userId: staffUser.id, shiftDate: day, shift: null, removeShift: 'SLOT_06_09' },
  });
  await call('getMySchedule', { as: 'staff', query: { week: weekStart } });
  await call('getMySchedule', { as: 'admin', query: { week: weekStart }, expectError: 403 });
  await call('requestMyShift', { as: 'staff', body: { shiftDate: day, shift: 'SLOT_09_12' } });
  await call('requestMyShift', { as: 'staff', body: { shiftDate: day, shift: 'SLOT_12_15' } });
  await call('withdrawMyShift', { as: 'staff', body: { shiftDate: day, shift: 'SLOT_12_15' } });
  const week = data(await call('listScheduleAssignments', { query: { week: weekStart } }));
  const pendingIds = week.flatMap((person: Json) =>
    person.shifts.filter((shift: Json) => shift.status === 'PENDING').map((shift: Json) => shift.id)
  );
  await call('reviewShifts', { body: { ids: pendingIds, action: 'APPROVE' } });
  await call('getShiftReport', { query: { month } });
  await call('setPayrollLock', { body: { month, locked: true } });
  await call('requestMyShift', { as: 'staff', body: { shiftDate: day, shift: 'SLOT_15_18' }, expectError: 409 });
  await call('setPayrollLock', { body: { month, locked: false } });

  // ---- Assets ----
  const asset = data(
    await call('createAsset', { body: { type: 'VEHICLE', name: 'Xe kiểm tra', code: `XE-${unique}`, licensePlate: '48A-000.00' } })
  );
  await call('listAssets');
  await call('listAssets', { query: { type: 'MACHINE' }, empty: true });
  await call('listMaintenance', { params: { id: asset.id }, empty: true });
  await call('updateAsset', { params: { id: asset.id }, body: { status: 'MAINTENANCE', notes: 'Kiểm tra hợp đồng' } });
  await call('createMaintenance', {
    params: { id: asset.id },
    body: { type: 'ROUTINE', performedAt: day, dueAt: null, cost: 150000 },
  });
  await call('listMaintenance', { params: { id: asset.id } });
  await call('deleteAsset', { params: { id: asset.id } });
  await call('deleteAsset', { params: { id: asset.id }, expectError: 404 });

  await call('logout');

  // ---- Result ----
  const missing = apiContracts.map((contract) => contract.id).filter((id) => !covered.has(id));
  for (const id of missing) failures.push(`contract "${id}" was not exercised`);

  if (failures.length > 0) {
    console.error(`\n✖ ${failures.length} contract problem(s) in ${checks} calls against ${BASE_URL}:\n`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.warn(`✓ ${covered.size}/${apiContracts.length} contracts verified in ${checks} calls against ${BASE_URL}`);
  if (RECORD) console.warn(`recorded ${recorded.size} fixtures in ${FIXTURE_DIR}/`);
}

main().catch((error) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
