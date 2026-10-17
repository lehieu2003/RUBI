import { expect, test, type APIResponse } from '@playwright/test';
import { ACCOUNTS, BASE_URL, sessionFile } from './support/env';
import { db, lockWaiters } from './support/db';

// The manager closes ("chốt") a payroll month only when no shift request of
// it is still waiting. A driver signing up for a shift of that month at the
// same moment must not slip a waiting request into the closed month: either
// the sign-up lands first and the close is refused, or the close lands first
// and the sign-up is refused.
//
// The driver had a rejected request for the shift, so signing up rewrites
// that row. The test holds the row locked so the sign-up stops after its
// "month not closed" check, sends the close, and lets the sign-up go once
// the close has answered or is queued too.

const DAY_MS = 24 * 60 * 60 * 1000;
const SHIFT = 'SLOT_12_15';
/** A Vietnam day three days ahead: open for sign-up whatever the hour. */
const DATE = new Date(Date.now() + 7 * 60 * 60 * 1000 + 3 * DAY_MS).toISOString().slice(0, 10);
const MONTH = DATE.slice(0, 7);

test.describe('a shift sign-up racing the close of its month', () => {
  test.use({ storageState: sessionFile('driver') });
  let factoryId = '';
  const where = () => ({ factoryId, shiftDate: new Date(`${DATE}T00:00:00.000Z`), shift: SHIFT } as const);

  test.beforeAll(async () => {
    factoryId = (await db.user.findUniqueOrThrow({ where: { email: ACCOUNTS.driver } })).factoryId!;
  });

  test.afterAll(async () => {
    await db.payrollLock.deleteMany({ where: { factoryId, month: MONTH } });
    await db.scheduleAssignment.deleteMany({ where: where() });
  });

  test('the close is refused while the sign-up is waiting', async ({ request, playwright }) => {
    const manager = await playwright.request.newContext({ baseURL: BASE_URL, storageState: sessionFile('manager') });
    await db.payrollLock.deleteMany({ where: { factoryId, month: MONTH } });
    await db.scheduleAssignment.deleteMany({ where: where() });
    const driver = await db.user.findUniqueOrThrow({ where: { email: ACCOUNTS.driver } });
    const row = await db.scheduleAssignment.create({ data: { ...where(), userId: driver.id, status: 'REJECTED' } });

    let signUp: Promise<APIResponse> | undefined;
    let close: Promise<APIResponse> | undefined;
    await db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM schedule_assignments WHERE id = ${row.id} FOR UPDATE`;
        signUp = request.post('/api/schedule/my', { data: { shiftDate: DATE, shift: SHIFT } });
        await expect.poll(lockWaiters, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);

        let closed = false;
        close = manager.post('/api/reports/shifts/lock', { data: { month: MONTH, locked: true } });
        void close.then(() => (closed = true));
        await expect.poll(async () => closed || (await lockWaiters()) >= 2, { timeout: 15_000 }).toBe(true);
      },
      { timeout: 30_000 }
    );
    const [signUpResponse, closeResponse] = await Promise.all([signUp!, close!]);
    await manager.dispose();

    expect(signUpResponse.status()).toBe(200);
    expect(closeResponse.status()).toBe(409);
    expect((await closeResponse.json()).code).toBe('PENDING_SHIFTS');
    expect(await db.payrollLock.count({ where: { factoryId, month: MONTH } })).toBe(0);
    expect((await db.scheduleAssignment.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('PENDING');
  });
});
