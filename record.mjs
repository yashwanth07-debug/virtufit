// Record a demo walkthrough of the live VirtuFit site for the demo video.
import { chromium } from 'playwright-core';
import { homedir } from 'node:os';
import { join } from 'node:path';

const exec = join(homedir(), '.cache', 'ms-playwright', 'chromium_headless_shell-1234', 'chrome-headless-shell-linux64', 'chrome-headless-shell');
const browser = await chromium.launch({
  executablePath: exec,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: '/home/user/virtufit-demo/videos', size: { width: 1280, height: 720 } },
});

const URL = 'https://yashwanth07-debug.github.io/virtufit/';
console.log('→ opening', URL);
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(5000); // hold on the title/landing

// Step 1: pick a person sample (first thumbnail)
await page.locator('.thumb').first().click();
await page.waitForTimeout(3500);
console.log('✓ person selected');

// Step 2: pick a garment sample (t-shirt — 13th thumb overall, first cloth)
await page.locator('.thumb').nth(12).click();
await page.waitForTimeout(3500);
console.log('✓ garment selected');

// Step 3: run the try-on (real YouCam cloth-v3)
await page.getByRole('button', { name: /run/i }).click();
console.log('→ running try-on…');
try {
  await page.waitForSelector('.result-badge', { timeout: 180000 });
  console.log('✓ result generated');
} catch {
  console.log('⚠ result badge not found — capturing current state');
}
await page.waitForTimeout(6000); // hold on the result

// small interaction: move the compare slider if present (seed slider is input[type=range] too; target the last one)
const ranges = page.locator('input[type="range"]');
const n = await ranges.count();
if (n > 0) {
  await ranges.nth(n - 1).evaluate((el) => {
    el.value = '20';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(1500);
}
console.log('→ closing (video saved)');
await page.close();
await browser.close();
console.log('DONE');
