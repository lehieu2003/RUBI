import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './e2e/support/env';

// Browser tests of the real flows, against a built app on a local, seeded
// database. Run them with `npm run e2e:local`; CI runs them after the build.
// They create and change data, so e2e/support/env.ts refuses anything that is
// not localhost.
export default defineConfig({
  testDir: './e2e',
  // One shared database: specs run one after the other.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  // The first visit of a server-rendered page on a cold CI runner can take
  // longer than the default five seconds.
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/support/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // E2E_BROWSER_CHANNEL=chrome uses the installed Chrome instead of the bundled Chromium.
    ...(process.env.E2E_BROWSER_CHANNEL ? { channel: process.env.E2E_BROWSER_CHANNEL } : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }],
});
