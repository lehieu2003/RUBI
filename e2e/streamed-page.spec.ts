import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { openPage } from './support/app';

// The app streams each page into a Suspense boundary (src/app/loading.tsx): the
// server HTML arrives in a hidden <div id="S:0"> that React reveals on the next
// animation frame. On a cold load React may render its own copy before that frame,
// so for a moment the page exists twice, once hidden, and a locator matches both.
test.describe('a page opened for a test', () => {
  test.use({ storageState: sessionFile('manager') });

  test('is there once, without the hidden streamed copy', async ({ page }) => {
    // The reveal runs on requestAnimationFrame. A cold load in a test browser can
    // paint its first frame late: make that frame come 1.5 s after the start.
    await page.addInitScript(() => {
      const start = performance.now();
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) => {
        const wait = 1_500 - (performance.now() - start);
        if (wait <= 0) return raf(callback);
        setTimeout(() => raf(callback), wait);
        return 0;
      };
    });
    await openPage(page, '/inventory');

    const hiddenCopies = await page.locator('[hidden][id^="S:"]').count();
    const filters = await page.getByLabel('Lọc theo sản phẩm').count();
    expect({ hiddenCopies, filters }).toEqual({ hiddenCopies: 0, filters: 1 });
  });
});
