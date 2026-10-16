import { expect, type Locator, type Page } from '@playwright/test';

/** Waits for a toast carrying this text. */
export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 15_000 });
}

/** Opens the order drawer and picks a customer with the keyboard only, as staff do on the phone. */
export async function openOrderDrawerFor(page: Page, customerPart: string): Promise<Locator> {
  await page.getByRole('button', { name: 'LÊN ĐƠN NHANH' }).first().click();
  const search = page.getByPlaceholder('Tìm khách hàng');
  // The drawer opens with the cursor already in the customer search.
  await expect(search).toBeFocused();
  await page.keyboard.type(customerPart, { delay: 20 });
  await expect(page.getByText(/Nhấn Enter để chọn nhanh/)).toBeVisible();
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog');
  await expect(drawer.locator('input[type=number]').first()).toBeVisible();
  // Prices arrive with the customer; the confirm total depends on them.
  await expect(drawer.getByText(/\d+\.\d{3}đ/).first()).toBeVisible();
  return drawer;
}

/** The cell of one product in the order grid: its row by name, its column by bag size. */
export async function gridCell(drawer: Locator, productName: string, sizeKg: number): Promise<Locator> {
  const headers = (await drawer.locator('thead th').allInnerTexts()).map((text) => text.trim().toUpperCase());
  const column = headers.indexOf(`${sizeKg}KG`);
  expect(column, `the grid has a ${sizeKg}kg column`).toBeGreaterThan(0);
  return drawer.locator('tbody tr', { hasText: productName }).locator('td').nth(column);
}

/** The settings screen on its staff tab. */
export async function openStaffSettings(page: Page): Promise<void> {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Nhân sự' }).click();
  await expect(page.getByText('Quản lý nhân sự')).toBeVisible();
}

/**
 * Opens a page of the app and waits until React has revealed the streamed page.
 * The server HTML of a page arrives in a hidden <div id="S:…"> that React moves into
 * place on the next animation frame; on a cold load React can render its own copy
 * first, so until that frame a locator would match the page twice.
 */
export async function openPage(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => !document.querySelector('[hidden][id^="S:"]'));
}
