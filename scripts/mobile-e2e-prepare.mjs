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

  const settle = (await call('GET', '/api/orders?status=DELIVERED&limit=200', { token })).data;
  if (!settle.some((order) => order.id === orderId)) problems.push('the order is not DELIVERED on the server');

  const staff = (await call('GET', '/api/staff', { token })).data.users.find((item) => item.id === userId);
  if (!staff) problems.push('the account is gone');

  // The shift the app left behind is waiting for the manager.
  const tomorrow = new Date(Date.now() + 7 * 3600e3 + 24 * 3600e3).toISOString().slice(0, 10);
  const monday = new Date(`${tomorrow}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const week = (await call('GET', `/api/schedule/assignments?week=${monday.toISOString().slice(0, 10)}`, { token })).data;
  const text = JSON.stringify(week);
  if (!text.includes(userId) || !text.includes('SLOT_21_24') || !text.includes('PENDING')) {
    problems.push('no PENDING SLOT_21_24 shift for the driver in the manager schedule');
  }

  if (problems.length > 0) {
    console.error('✖ ' + problems.join('\n✖ '));
    process.exit(1);
  }
  console.log('✓ server state matches what the app did: order DELIVERED and logged for the driver, shift pending');
}

const [command, ...args] = process.argv.slice(2);
if (command === 'prepare') await prepare();
else if (command === 'verify') await verify(...args);
else throw new Error('usage: mobile-e2e-prepare.mjs prepare | verify <userId> <orderId> <userName>');
