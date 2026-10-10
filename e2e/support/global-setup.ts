import { mkdirSync } from 'node:fs';
import { chromium, type FullConfig } from '@playwright/test';
import { ACCOUNTS, BASE_URL, PASSWORD, type Role, sessionFile } from './env';

// Sign in once per role and keep the session: the login endpoint allows five
// attempts per account per minute, far fewer than the number of tests.
export default async function globalSetup(config: FullConfig) {
  mkdirSync('e2e/.auth', { recursive: true });
  const browser = await chromium.launch({ channel: config.projects[0].use.channel });
  for (const role of Object.keys(ACCOUNTS) as Role[]) {
    const page = await browser.newPage({ baseURL: BASE_URL });
    await page.goto('/login');
    await page.fill('#email', ACCOUNTS[role]);
    await page.fill('#password', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
    await page.context().storageState({ path: sessionFile(role) });
    await page.close();
  }
  await browser.close();
}
