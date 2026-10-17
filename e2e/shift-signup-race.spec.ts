import { expect, test, type APIResponse } from '@playwright/test';
import { ACCOUNTS, BASE_URL, PASSWORD, sessionFile } from './support/env';
import { db, lockWaiters } from './support/db';

// The manager caps how many drivers can sign up for one shift. Two drivers
// signing up for the last place at the same moment must not both get it.
//
// Both drivers had a rejected request for the shift, so signing up rewrites
// their row. The test holds both rows locked until both sign-ups are queued
// behind them, then lets them go.

const DAY_MS = 24 * 60 * 60 * 1000;
const SHIFT = 'SLOT_09_12';
/** A Vietnam day three days ahead: open for sign-up whatever the hour. */
const DATE = new Date(Date.now() + 7 * 60 * 60 * 1000 + 3 * DAY_MS).toISOString().slice(0, 10);
const SECOND_DRIVER = 'taixe2@miendong.vn';

test.describe('two drivers signing up for the last place of a shift', () => {
  test.use({ storageState: sessionFile('driver') });
  let factoryId = '';
  let limitBefore: number | null = null;
  const where = () => ({ factoryId, shiftDate: new Date(`${DATE}T00:00:00.000Z`), shift: SHIFT } as const);

  test.beforeAll(async () => {
    const factory = await db.factory.findFirstOrThrow({ where: { users: { some: { email: ACCOUNTS.driver } } } });
    factoryId = factory.id;
    limitBefore = factory.maxDriversPerShift;
    await db.factory.update({ where: { id: factoryId }, data: { maxDriversPerShift: 1 } });
    await db.payrollLock.deleteMany({ where: { factoryId, month: DATE.slice(0, 7) } });
  });

  test.afterAll(async () => {
    await db.scheduleAssignment.deleteMany({ where: where() });
    await db.factory.update({ where: { id: factoryId }, data: { maxDriversPerShift: limitBefore } });
  });

  test('one gets the place, the other is told the shift is full', async ({ request, playwright }) => {
    const second = await playwright.request.newContext({ baseURL: BASE_URL });
    expect((await second.post('/api/auth/login', { data: { email: SECOND_DRIVER, password: PASSWORD } })).ok()).toBe(true);

    await db.scheduleAssignment.deleteMany({ where: where() });
    const users = await db.user.findMany({ where: { email: { in: [ACCOUNTS.driver, SECOND_DRIVER] } } });
    const rows = await Promise.all(
      users.map((user) => db.scheduleAssignment.create({ data: { ...where(), userId: user.id, status: 'REJECTED' } }))
    );
    const ids = rows.map((row) => row.id);

    const signUp = { data: { shiftDate: DATE, shift: SHIFT } };
    let pending: Array<Promise<APIResponse>> = [];
    await db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM schedule_assignments WHERE id = ANY(${ids}) FOR UPDATE`;
        pending = [request.post('/api/schedule/my', signUp), second.post('/api/schedule/my', signUp)];
        await expect.poll(lockWaiters, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
      },
      { timeout: 30_000 }
    );
    const responses = await Promise.all(pending);

    expect(responses.map((response) => response.status()).sort()).toEqual([200, 409]);
    const refused = responses.find((response) => response.status() === 409)!;
    expect((await refused.json()).code).toBe('SHIFT_FULL');
    expect(await db.scheduleAssignment.count({ where: { ...where(), status: 'PENDING' } })).toBe(1);
    await second.dispose();
  });
});
