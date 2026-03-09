// @ts-check
const { test } = require('@playwright/test');

async function analyzeAndWait(page) {
  await page.goto('http://localhost:5173/querulous/');
  await page.getByRole('button', { name: 'Analyze' }).click();
  await page.waitForSelector('svg', { timeout: 15000 });
  await page.waitForTimeout(800);
}

test('score breakdown - dissonant note, full panel', async ({ page }) => {
  await analyzeAndWait(page);
  // Find the viz SVG with interval groups
  const svgs = page.locator('svg');
  for (let s = 0; s < await svgs.count(); s++) {
    const svg = svgs.nth(s);
    const groups = svg.locator('g[style*="cursor: pointer"]');
    if (await groups.count() >= 4) {
      await svg.scrollIntoViewIfNeeded();
      // Click groups until we find one that shows 'Entry Motion'
      for (let i = 0; i < await groups.count(); i++) {
        await groups.nth(i).click({ force: true });
        await page.waitForTimeout(300);
        if (await page.locator('text=Entry Motion').count() > 0) {
          // Scroll to the breakdown heading and screenshot generously below it
          const heading = page.locator('text=Score Breakdown').first();
          await heading.scrollIntoViewIfNeeded();
          await page.waitForTimeout(200);
          await page.screenshot({ path: '/tmp/ss-breakdown-main.png', clip: {
            x: 0, y: (await heading.boundingBox()).y - 20,
            width: 1280, height: 700
          }});
          break;
        }
      }
      break;
    }
  }
});

test('chain note - full breakdown panel', async ({ page }) => {
  await analyzeAndWait(page);
  const svgs = page.locator('svg');
  for (let s = 0; s < await svgs.count(); s++) {
    const svg = svgs.nth(s);
    const groups = svg.locator('g[style*="cursor: pointer"]');
    if (await groups.count() >= 4) {
      await svg.scrollIntoViewIfNeeded();
      for (let i = 0; i < await groups.count(); i++) {
        await groups.nth(i).click({ force: true });
        await page.waitForTimeout(300);
        if (await page.locator('text=/chain/i').count() > 0 && await page.locator('text=Entry Motion').count() > 0) {
          const heading = page.locator('text=Score Breakdown').first();
          await heading.scrollIntoViewIfNeeded();
          await page.waitForTimeout(200);
          const box = await heading.boundingBox();
          await page.screenshot({ path: '/tmp/ss-chain-main.png', clip: {
            x: 0, y: box.y - 120,
            width: 1280, height: 900
          }});
          break;
        }
      }
      break;
    }
  }
});
