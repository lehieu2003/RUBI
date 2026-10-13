// Prepares what mobile/integration_test/app_e2e_test.dart needs on a LOCAL
// server with seeded data, and checks afterwards what the app left behind.
//
//   node scripts/mobile-e2e-prepare.mjs prepare   -> prints KEY=value lines
//   node scripts/mobile-e2e-prepare.mjs verify <driverUserId> <orderId>
//
// BASE_URL must be local: it creates an account and changes an order.
const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const host = new URL(BASE_URL).hostname;
if (host !== 'localhost' && host !== '127.0.0.1') {
  throw new Error(`BASE_URL points at "${host}". This script only runs against a local server.`);
}

const MANAGER = { email: 'quanly@rubi.local', password: '12345678' };

async function call(method, path, { token, body } = {}) {
  const response = await fetch(BASE_URL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status} ${json?.error ?? ''}`);
  return json;
}

const managerToken = async () => (await call('POST', '/api/auth/login', { body: MANAGER })).data.token;

async function prepare() {
  const token = await managerToken();
  const stamp = Date.now().toString(36);
  const email = `taixe-app-${stamp}@rubi.local`;
  const password = 'Tam12345x';
  const name = `Tài Xế App ${stamp}`;

  // An account as the manager hands it out: it must change its password.
  const user = (await call('POST', '/api/staff', { token, body: { name, email, password, role: 'DRIVER' } })).data.user;
  const driver = (await call('GET', '/api/drivers', { token })).data.find((item) => item.name === name);
  if (!driver) throw new Error('The new driver is not in /api/drivers');

  // One order out for delivery with that driver.
  const order = (await call('GET', '/api/orders?status=PENDING&limit=1', { token })).data[0];
  if (!order) throw new Error('The seed has no PENDING order');
  await call('PATCH', '/api/orders/bulk-assign', { token, body: { orderIds: [order.id], driverId: driver.id } });
  // That was the seed's only waiting order: put another one back in the queue
  // for the staff account to work on in the app.
  const other = (await call('GET', '/api/orders?status=SHIPPING&limit=1', { token })).data[0];
  if (!other) throw new Error('The seed has no SHIPPING order');
  await call('PATCH', `/api/orders/${other.id}/status`, { token, body: { status: 'PENDING' } });
  await call('PATCH', `/api/orders/${order.id}/status`, { token, body: { status: 'SHIPPING' } });

  for (const [key, value] of Object.entries({
    E2E_EMAIL: email,
    E2E_PASSWORD: password,
    E2E_NEW_PASSWORD: 'Matkhau2026x',
    E2E_CUSTOMER: order.customer.name,
    E2E_USER_ID: user.id,
    E2E_USER_NAME: name,
    E2E_ORDER_ID: order.id,
  })) {
    console.log(`${key}=${value}`);
  }
}

async function verify(userId, orderId, userName) {
  const token = await managerToken();
  const problems = [];

  const trail = (await call('GET', `/api/audit-logs?orderId=${orderId}`, { token })).data;
  const delivered = trail.find((entry) => entry.action === 'ORDER_DELIVERED');
  if (!delivered) problems.push('no ORDER_DELIVERED entry in the audit log');
  else if (delivered.userName !== userName) problems.push(`delivery logged for "${delivered.userName}", expected "${userName}"`);

  // The manager settled it in the app, one short on its first line.
  const settled = (await call('GET', '/api/orders?status=COMPLETED&limit=200', { token })).data.find((order) => order.id === orderId);
  if (!settled) problems.push('the order is not COMPLETED on the server');
  else if (settled.orderItems[0].actualQty !== settled.orderItems[0].quantity - 1) {
    problems.push(`first line settled at ${settled.orderItems[0].actualQty}, expected ${settled.orderItems[0].quantity - 1}`);
  }
  if (!trail.some((entry) => entry.action === 'ORDER_SETTLED')) problems.push('no ORDER_SETTLED entry in the audit log');

  const staff = (await call('GET', '/api/staff', { token })).data.users.find((item) => item.id === userId);
  if (!staff) problems.push('the account is gone');

  // The shift the driver requested in the app was approved by the manager in the app.
  const tomorrow = new Date(Date.now() + 7 * 3600e3 + 24 * 3600e3).toISOString().slice(0, 10);
  const monday = new Date(`${tomorrow}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const week = (await call('GET', `/api/schedule/assignments?week=${monday.toISOString().slice(0, 10)}`, { token })).data;
  const person = week.find((item) => item.id === userId);
  const requested = person?.shifts.find((shift) => shift.shift === 'SLOT_21_24' && shift.shiftDate === tomorrow);
  if (!requested) problems.push('no SLOT_21_24 shift of tomorrow for the driver in the manager schedule');
  else if (requested.status !== 'APPROVED') problems.push(`the driver's shift is ${requested.status}, expected APPROVED`);

  // The payment the manager recorded in the app is in the audit log.
  const debtTrail = (await call('GET', '/api/audit-logs?type=DEBT&limit=20', { token })).data;
  if (!debtTrail.some((entry) => entry.action === 'DEBT_PAYMENT' && entry.summary.includes('Thu thử từ app'))) {
    problems.push('no DEBT_PAYMENT entry for the payment recorded in the app');
  }

  // The order the staff account assigned and then cancelled in the app.
  const orderTrail = (await call('GET', '/api/audit-logs?type=ORDER&limit=50', { token })).data;
  const cancelled = orderTrail.find((entry) => entry.summary.includes('Hủy thử từ app'));
  if (!cancelled) problems.push('no audit entry for the order cancelled in the app');
  else if (!orderTrail.some((entry) => entry.action === 'ORDER_ASSIGNED' && entry.orderId === cancelled.orderId)) {
    problems.push('the order cancelled in the app has no ORDER_ASSIGNED entry');
  }
  // That same order was taken in the app, by the staff account.
  const takenInApp = cancelled && orderTrail.find((entry) => entry.action === 'ORDER_CREATED' && entry.orderId === cancelled.orderId);
  if (cancelled && !takenInApp) problems.push('the order cancelled in the app was not created in the app (no ORDER_CREATED entry)');

  // The customer the manager added in the app.
  const customers = (await call('GET', '/api/customers', { token })).data;
  const added = customers.find((customer) => customer.code === 'KH-APP');
  if (!added) problems.push('no customer KH-APP: the one added in the app is missing');
  else if (added.name !== 'Khách Thêm Từ App' || added.phone !== '0900111222') {
    problems.push(`customer KH-APP stored as "${added.name}" / "${added.phone}"`);
  }

  // The account the manager created in the app and then locked.
  const made = (await call('GET', '/api/staff', { token })).data.users.find((item) => item.email === 'nv-app@rubi.local');
  if (!made) problems.push('no account nv-app@rubi.local: the one created in the app is missing');
  else if (made.role !== 'STAFF' || made.isActive !== false) {
    problems.push(`account nv-app@rubi.local is ${made.role}, active=${made.isActive}; expected a locked STAFF account`);
  }

  // The own price the manager gave a customer in the app.
  const minhTam = customers.find((customer) => customer.name === 'Đại Lý Nước Ngọt Minh Tâm');
  const ownPrices = minhTam ? (await call('GET', `/api/customers/${minhTam.id}/prices`, { token })).data : [];
  if (ownPrices[0]?.customPrice !== 11111 || ownPrices[0]?.price !== 11111) {
    problems.push(`own price of the first product for Minh Tâm is ${ownPrices[0]?.customPrice}, expected the 11111 set in the app`);
  }

  // The default price the manager changed in the app (first product by name).
  const priceList = (await call('GET', '/api/prices/global', { token })).data;
  if (priceList[0]?.price !== 12345) {
    problems.push(`default price of ${priceList[0]?.name} ${priceList[0]?.sizeKg}kg is ${priceList[0]?.price}, expected the 12345 set in the app`);
  }

  if (problems.length > 0) {
    console.error('✖ ' + problems.join('\n✖ '));
    process.exit(1);
  }
  console.log('✓ server state matches what the app did: order delivered by the driver and settled by the manager, shift requested and approved, payment recorded, an order taken, assigned and cancelled, a customer added and another given their own price, a default price changed, an account created and locked');
}

const [command, ...args] = process.argv.slice(2);
if (command === 'prepare') await prepare();
else if (command === 'verify') await verify(...args);
else throw new Error('usage: mobile-e2e-prepare.mjs prepare | verify <userId> <orderId> <userName>');
