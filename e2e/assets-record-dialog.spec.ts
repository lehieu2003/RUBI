import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { db } from './support/db';
import { openPage } from './support/app';

// The "Ghi nhận bảo trì" dialog sits on the asset drawer. Esc closes the top
// layer only, and the dialog never outlives the asset it was opened for.
test.describe('the maintenance record dialog on an asset', () => {
  test.use({ storageState: sessionFile('manager') });
  const CODES = ['E2E-MAY-A', 'E2E-MAY-B'];

  test.beforeAll(async () => {
    const { factoryId } = await db.user.findUniqueOrThrow({ where: { email: 'quanly@rubi.local' } });
    await db.asset.deleteMany({ where: { code: { in: CODES } } });
    for (const code of CODES) {
      await db.asset.create({ data: { factoryId: factoryId!, type: 'MACHINE', name: `Máy ${code}`, code } });
    }
  });

  test.afterAll(async () => {
    await db.asset.deleteMany({ where: { code: { in: CODES } } });
  });

  test('Esc closes the dialog, then the drawer; the next asset opens without it', async ({ page }) => {
    await openPage(page, '/assets');
    const record = page.getByRole('dialog', { name: 'Ghi nhận bảo trì' });
    const drawerOf = (code: string) => page.getByRole('dialog', { name: `Tài sản: Máy ${code}` });

    await page.getByRole('button', { name: `Máy ${CODES[0]}` }).click();
    await expect(drawerOf(CODES[0])).toBeVisible();
    await page.getByRole('button', { name: 'GHI NHẬN', exact: true }).click();
    await expect(record).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(record).toBeHidden();
    await expect(drawerOf(CODES[0])).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawerOf(CODES[0])).toBeHidden();

    await page.getByRole('button', { name: `Máy ${CODES[1]}` }).click();
    await expect(drawerOf(CODES[1])).toBeVisible();
    await expect(record).toBeHidden();
  });
});
