import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { db } from './support/db';

const DAY_MS = 86_400_000;
const CODE = 'E2E-DUE-1';

// A maintenance done again replaces the due date of the one before it: the
// asset is due when the latest record of each type says so.
test.describe('next maintenance due date', () => {
  test.use({ storageState: sessionFile('manager') });

  let dueLater = new Date();

  test.beforeAll(async () => {
    const factory = await db.factory.findFirstOrThrow();
    await db.asset.deleteMany({ where: { code: CODE } });
    const now = Date.now();
    dueLater = new Date(now + 365 * DAY_MS);
    await db.asset.create({
      data: {
        factoryId: factory.id,
        type: 'MACHINE',
        name: 'Máy đá E2E đã bảo dưỡng lại',
        code: CODE,
        maintenanceRecords: {
          create: [
            // Old routine maintenance, due in 5 days...
            { factoryId: factory.id, type: 'ROUTINE', performedAt: new Date(now - 360 * DAY_MS), dueAt: new Date(now + 5 * DAY_MS) },
            // ...done again since, next due in a year.
            { factoryId: factory.id, type: 'ROUTINE', performedAt: new Date(now - DAY_MS), dueAt: dueLater },
          ],
        },
      },
    });
  });

  test.afterAll(async () => {
    await db.asset.deleteMany({ where: { code: CODE } });
  });

  test('the asset list shows the due date of the latest record', async ({ page }) => {
    const response = await page.request.get('/api/assets');
    expect(response.status()).toBe(200);
    const asset = (await response.json()).data.find((row: { code: string }) => row.code === CODE);
    expect(asset.nextDue).toBe(dueLater.toISOString());
    expect(asset.nextDueType).toBe('ROUTINE');
  });

  test('the dashboard does not raise the superseded due date', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('main').getByText('Doanh số hôm nay', { exact: true })).toBeVisible();
    await expect(page.getByText('Máy đá E2E đã bảo dưỡng lại')).toHaveCount(0);
  });
});
