import { PROFILE_FONT_MAP } from '../../shared/profile-typography';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile, access } from 'node:fs/promises';
import { ExportCanvas, compositionCss } from './compositions';
import type { StudioComposition } from '../../shared/creative-studio';

import path from 'node:path';
async function systemChromium(): Promise<string | undefined> {
  if (process.env.CREATIVE_STUDIO_CHROMIUM_PATH) return process.env.CREATIVE_STUDIO_CHROMIUM_PATH;
  if (process.platform !== 'linux') return undefined;
  for (const directory of (process.env.PATH || '').split(path.delimiter)) {
    for (const name of ['chromium', 'chromium-browser']) {
      const filename = path.join(directory, name);
      try { await access(filename, 1); return filename; } catch {}
    }
  }
}
let busy = false;
export async function renderExport(data: StudioComposition): Promise<Buffer> {
  if (busy) throw new Error('Creative Studio is rendering another graphic. Please try again shortly.');
  busy = true;
  let browser: import('playwright').Browser | undefined;
  try {
    const [{ chromium }, { default: sharp }] = await Promise.all([import('playwright'), import('sharp')]);
    const themeCss = await readFile(process.env.NODE_ENV === 'production' ? 'dist/creative-studio/profile-themes.css' : 'client/src/styles/profile-themes.css', 'utf8');
    const executablePath = await systemChromium();
    browser = await chromium.launch({ headless: true, timeout: 15000, ...(executablePath ? { executablePath } : {}) });
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, reducedMotion: 'reduce', locale: 'en-GB', timezoneId: 'UTC', serviceWorkers: 'block' });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    // All media is decoded and embedded before rendering. Only the application's
    // font providers may be contacted; no cookies or user-supplied URLs are visited.
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.protocol === 'https:' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname) ? route.continue() : route.abort();
    });
    const fonts = resolveFonts(data);
    const fontsUrl = `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&${fonts.map(font => `family=${encodeURIComponent(font)}&`).join('')}display=block`;
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${fontsUrl.replaceAll('&','&amp;')}"><style>${themeCss}</style><style>${compositionCss}</style></head><body>${renderToStaticMarkup(React.createElement(ExportCanvas, { data }))}</body></html>`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.evaluate(async (themeFonts) => {
      const loaded = await document.fonts.load('700 44px "Space Grotesk"');
      for (const themeFont of themeFonts) {
        const themed = await document.fonts.load(`400 24px "${themeFont}"`);
        if (!themed.length || themed.some(face => face.status !== 'loaded')) throw new Error('Equipped theme font did not load');
      }
      await document.fonts.ready;
      if (!loaded.length || loaded.some(font => font.status !== 'loaded')) throw new Error('Gamefolio font did not load');
      await Promise.all(Array.from(document.images).map(image => image.decode()));
      if (!document.fonts.check('700 44px "Space Grotesk"')) throw new Error('Gamefolio font did not load');
    }, fonts);
    // Shrink bounded text areas rather than truncate real names or large statistics.
    await page.evaluate(() => {
      for (const element of Array.from(document.querySelectorAll<HTMLElement>('[data-fit]'))) {
        let size = parseFloat(getComputedStyle(element).fontSize);
        while ((element.scrollHeight > parseFloat(getComputedStyle(element).maxHeight) + 2 || element.scrollWidth > element.clientWidth + 1) && size > 12) {
          element.style.fontSize = `${--size}px`;
        }
      }
    });
    const oversized = await page.evaluate(() => Array.from(document.querySelectorAll('[data-fit]')).some(el => el.scrollHeight > parseFloat(getComputedStyle(el).maxHeight) + 2 || el.scrollWidth > el.clientWidth + 2));
    const outsideSafeArea = await page.evaluate(() => Array.from(document.querySelectorAll('[data-fit],.profile-stats,.leaderboard-row,.game-copy,header,footer')).some(element => {
      const rect = element.getBoundingClientRect();
      return rect.left < 99 || rect.top < 99 || rect.right > 1821 || rect.bottom > 981;
    }));
    if (oversized || outsideSafeArea) throw new Error('Some text does not fit this composition. Try fewer leaderboard rows or another graphic.');
    const screenshot = await page.locator('#export-canvas').screenshot({ type: 'png', animations: 'disabled', timeout: 15000 });
    return await sharp(screenshot).resize(1920, 1080, { kernel: 'lanczos3' }).png().toBuffer();
  } finally { try { await browser?.close(); } finally { busy = false; } }
}
import { resolveProfileTheme } from '../../shared/profile-theme';
function resolveFonts(data: StudioComposition): string[] {
  if (!data.profile) return [];
  return Array.from(new Set([
    resolveProfileTheme(data.profile).theme?.fontFamily,
    data.profile.profileFont && data.profile.profileFont !== 'default' ? PROFILE_FONT_MAP[data.profile.profileFont]?.family : undefined,
  ].filter((font): font is string => !!font).map(font => font.split(',')[0].replaceAll("'", '')))).filter(font => font !== 'Space Grotesk');
}
