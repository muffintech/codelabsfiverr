// Renders tools/og-image.html to assets/og-image.png (1200x630).
// Usage: npm i playwright-core && node tools/render.mjs [path-to-chromium]
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'url';
import path from 'path';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const browser = await chromium.launch(process.argv[2] ? { executablePath: process.argv[2] } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto('file://' + path.join(root, 'tools/og-image.html'), { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(root, 'assets/og-image.png') });
await browser.close();
