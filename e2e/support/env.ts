// These tests write to the database behind the app. The project's .env points
// at the production database, so nothing here reads it: both addresses must be
// given explicitly and must be local.

function localOnly(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Run the suite with "npm run e2e:local".`);
  }
  const host = new URL(value).hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(`${name} points at "${host}". The browser tests only run against a local app and database.`);
  }
  return value.replace(/\/$/, '');
}

/** The built app under test, e.g. http://127.0.0.1:3100 */
export const BASE_URL = localOnly('E2E_BASE_URL');
/** The throwaway database that app is connected to */
export const DATABASE_URL = localOnly('E2E_DATABASE_URL');

/** Seeded accounts (src/db/seed.ts) and their default password */
export const PASSWORD = '12345678';
export const ACCOUNTS = {
  manager: 'quanly@rubi.local',
  staff: 'nhanvien@miendong.vn',
  driver: 'taixe1@miendong.vn',
} as const;
export type Role = keyof typeof ACCOUNTS;

/** Where the signed-in session of each role is kept between tests */
export const sessionFile = (role: Role) => `e2e/.auth/${role}.json`;
