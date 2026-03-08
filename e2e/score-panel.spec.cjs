// @ts-check
const { test } = require('@playwright/test');

test.describe('Score panel screenshot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174/querulous/');
    await page.getByRole('button', { name: 'Analyze' }).click();
    await page.waitForSelector('svg', { timeout: 15000 });
    await page.waitForTimeout(800);
  });

  test('full page after analysis', async ({ page }) => {
    await page.screenshot({ path: '/tmp/ss-full.png', fullPage: true });
  });

  test('score breakdown - first dissonant note', async ({ page }) => {
    // Intervals are clickable <g> groups containing a <rect> hit area
    const svgs = page.locator('svg');
    const svgCount = await svgs.count();

    for (let s = 0; s < svgCount; s++) {
      const svg = svgs.nth(s);
      const groups = svg.locator('g[style*="cursor: pointer"]');
      const groupCount = await groups.count();
      if (groupCount >= 4) {
        await svg.scrollIntoViewIfNeeded();
        for (let i = 0; i < groupCount; i++) {
          await groups.nth(i).click({ force: true });
          await page.waitForTimeout(150);
          const bd = page.locator('[data-testid="interval-score-breakdown"]');
          if (await bd.count() > 0) {
            await bd.first().screenshot({ path: '/tmp/ss-breakdown-first.png' });
            await page.screenshot({ path: '/tmp/ss-full-first-selected.png' });
            break;
          }
        }
        break;
      }
    }
  });

  test('score breakdown - chain note', async ({ page }) => {
    const svgs = page.locator('svg');
    const svgCount = await svgs.count();
    let found = false;

    for (let s = 0; s < svgCount && !found; s++) {
      const svg = svgs.nth(s);
      const groups = svg.locator('g[style*="cursor: pointer"]');
      const groupCount = await groups.count();
      if (groupCount >= 4) {
        await svg.scrollIntoViewIfNeeded();
        for (let i = 0; i < groupCount && !found; i++) {
          await groups.nth(i).click({ force: true });
          await page.waitForTimeout(150);
          const banner = page.locator('[data-testid="chain-score-banner"]');
          if (await banner.count() > 0) {
            const bd = page.locator('[data-testid="interval-score-breakdown"]').first();
            await bd.screenshot({ path: '/tmp/ss-breakdown-chain.png' });
            await page.screenshot({ path: '/tmp/ss-full-chain-selected.png' });
            found = true;
          }
        }
      }
    }
    if (!found) {
      await page.screenshot({ path: '/tmp/ss-no-chain-found.png' });
      console.log('No chain in default piece - need a piece with consecutive dissonances');
    }
  });
});
