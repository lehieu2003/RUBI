import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const staffRoute = readFileSync('src/app/api/staff/route.ts', 'utf8');
const staffIdRoute = readFileSync('src/app/api/staff/[id]/route.ts', 'utf8');

describe('staff driver account source checks', () => {
  it('allows DRIVER as a staff-managed account role', () => {
    assert.match(staffRoute, /'DRIVER'/);
    assert.match(staffIdRoute, /'DRIVER'/);
  });

  it('creates or links driver profiles from DRIVER accounts', () => {
    assert.match(staffRoute, /role === 'DRIVER'/);
    assert.match(staffRoute, /tx\.driver\.create/);
    assert.match(staffIdRoute, /updatedUser\.role === 'DRIVER'/);
    assert.match(staffIdRoute, /userId: updatedUser\.id/);
  });
});

describe('staff password policy', () => {
  const createRoute = readFileSync('src/app/api/staff/route.ts', 'utf8');
  const updateRoute = readFileSync('src/app/api/staff/[id]/route.ts', 'utf8');
  const settingsPage = readFileSync('src/app/settings/page.tsx', 'utf8');

  it('enforces the shared password policy everywhere (create, reset, UI)', () => {
    for (const [name, source] of [['create', createRoute], ['update', updateRoute]]) {
      assert.doesNotMatch(source, /length < 6/, `${name} route still allows 6-char passwords`);
      assert.match(source, /validatePassword\(/, `${name} route must apply the shared password policy`);
    }
    assert.match(settingsPage, /length < 8/);
    assert.doesNotMatch(settingsPage, /length < 6/);
    assert.doesNotMatch(settingsPage, /ít nhất 6 ký tự/);
  });
});

describe('driver share link is gone', () => {
  it('drivers have no link token: the page, both APIs and the columns are removed', () => {
    for (const path of ['src/app/d', 'src/app/api/d', 'src/app/api/staff/[id]/rotate-link']) {
      assert.equal(existsSync(path), false, `${path} must not exist`);
    }
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    const driverModel = schema.slice(schema.indexOf('model Driver {'), schema.indexOf('}', schema.indexOf('model Driver {')));
    assert.doesNotMatch(driverModel, /\btoken\b|\bslug\b/);
    assert.doesNotMatch(readFileSync('src/app/settings/page.tsx', 'utf8'), /rotate-link|link giao hàng/);
  });

  it('the driver order list and delivery confirmation accept a session only', () => {
    for (const path of ['src/app/api/driver/orders/route.ts', 'src/app/api/orders/[id]/confirm/route.ts']) {
      const source = readFileSync(path, 'utf8');
      assert.match(source, /requireRole\(\['DRIVER'\]\)/, path);
      assert.doesNotMatch(source, /searchParams\.get\('token'\)|where:\s*\{\s*token/, path);
    }
  });
});

describe('a driver who can no longer deliver gives up their open orders', () => {
  const route = readFileSync('src/app/api/staff/[id]/route.ts', 'utf8');

  it('unassigns PENDING and SHIPPING orders only, inside the same transaction', () => {
    assert.match(route, /status: \{ in: \['PENDING', 'SHIPPING'\] \}, driver: \{ userId \}/);
    assert.match(route, /data: \{ driverId: null \}/);
    assert.equal(route.match(/unassignOpenOrders\(tx, factoryId, /g)?.length, 2, 'on lock / role change and on delete');
  });

  it('looks the driver profile up with the factory filter the tenant guard requires', () => {
    assert.doesNotMatch(route, /tx\.driver\.findUnique/);
    assert.match(route, /tx\.driver\.findFirst\(\{\s*where: \{ userId: updatedUser\.id, factoryId \}/);
  });

  it('keeps the orders of a driver who is still active', () => {
    assert.match(route, /const stillDelivers = updatedUser\.role === 'DRIVER' && updatedUser\.isActive/);
    assert.match(route, /stillDelivers \? 0 : await unassignOpenOrders/);
  });

  it('tells the manager how many orders need a new driver', () => {
    assert.match(route, /apiSuccess\(\{ user, unassignedOrders \}\)/);
    assert.match(route, /apiSuccess\(\{ success: true, unassignedOrders \}\)/);
    assert.match(readFileSync('src/app/settings/page.tsx', 'utf8'), /đơn chưa giao của tài xế này đã được gỡ gán/);
  });
});

describe('customer price page', () => {
  it('is reachable from the customer drawer, for the manager only', () => {
    const list = readFileSync('src/app/customers/page.tsx', 'utf8');
    assert.match(list, /user\?\.role === 'ADMIN' && \(\s*<Link\s*href=\{`\/customers\/\$\{selectedCustomer\.id\}`\}/);
  });

  it('has the app layout and sends anyone but the manager back to the list', () => {
    const page = readFileSync('src/app/customers/[id]/page.tsx', 'utf8');
    assert.match(page, /<DashboardLayout>/);
    assert.match(page, /if \(session\.role !== 'ADMIN'\) \{\s*redirect\('\/customers'\)/);
  });
});

describe('account phone numbers', () => {
  it('accepts usual phone formats and an empty value, refuses text', async () => {
    const { CreateStaffBody, UpdateStaffBody } = await import('../../src/lib/contracts/accounts');
    for (const phone of ['0909123456', '+84 909 123 456', '0909.123.456', '']) {
      assert.ok(UpdateStaffBody.safeParse({ phone }).success, phone);
    }
    assert.ok(UpdateStaffBody.safeParse({ phone: null }).success);
    for (const phone of ['abc', '12345', 'so cua toi 0909123456']) {
      assert.equal(UpdateStaffBody.safeParse({ phone }).success, false, phone);
    }
    assert.ok(CreateStaffBody.safeParse({ name: 'A', email: 'a@rubi.vn', password: 'x', role: 'DRIVER', phone: '0909123456' }).success);
    assert.ok(CreateStaffBody.safeParse({ name: 'A', email: 'a@rubi.vn', password: 'x', role: 'STAFF' }).success);
  });

  it("a driver's phone is copied to the driver profile and must be unique among drivers", () => {
    const update = readFileSync('src/app/api/staff/[id]/route.ts', 'utf8');
    const create = readFileSync('src/app/api/staff/route.ts', 'utf8');
    assert.match(update, /\.\.\.\(body\.phone !== undefined \? \{ phone: updatedUser\.phone \} : \{\}\)/);
    // the list falls back to the number kept on the driver profile
    assert.match(create, /phone: user\.phone \?\? driverProfile\?\.phone \?\? null/);
    assert.match(update, /where: \{ factoryId: session\.factoryId, phone, id: \{ not: existing\.driverProfile\?\.id \} \}/);
    for (const source of [update, create]) assert.match(source, /409, 'PHONE_TAKEN'/);
  });

  it('the settings screen shows and edits the phone, and reads a new account out of the envelope', () => {
    const page = readFileSync('src/app/settings/page.tsx', 'utf8');
    assert.match(page, /body: JSON\.stringify\(\{ name: editName\.trim\(\), phone: editPhone\.trim\(\) \}\)/);
    assert.match(page, /data\?\.data\?\.user \?\? data\?\.user/);
    assert.doesNotMatch(page, /if \(data\.user\)/);
  });
});

describe('shell count correction', () => {
  const route = readFileSync('src/app/api/deposits/shells/route.ts', 'utf8');

  it('SET replaces both totals and needs both numbers; the default still adds', () => {
    assert.match(route, /mode === 'SET' && \(shellsOut === undefined \|\| shellsIn === undefined\)/);
    assert.match(route, /mode === 'SET'\s*\? \{ shellsOut, shellsIn \}/);
    assert.match(route, /shellsOut: \{ increment: shellsOut \?\? 0 \}/);
  });

  it('the screen sends a correction as SET', () => {
    assert.match(readFileSync('src/app/deposits/shells/page.tsx', 'utf8'), /mode: 'SET', shellsOut: editOutQty, shellsIn: editInQty/);
  });
});
