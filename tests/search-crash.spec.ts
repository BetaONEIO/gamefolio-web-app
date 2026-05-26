import { test, expect } from '@playwright/test';

/**
 * Reproduces the reported crash: clicking the search bar in the Header
 * triggers a React error ("Cannot update WalletProviderInner while rendering
 * Hydrate" / "Rendered fewer hooks than expected") via the wagmi v2 Hydrate
 * + SequenceConnectProvider subscription chain.
 *
 * @e2e
 */
test.describe('Header search bar', () => {
  const collectErrors = (page: import('@playwright/test').Page) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      errors.push(`[pageerror] ${err.message}\n${err.stack ?? ''}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore unrelated noise (CORS to cloudflareinsights, vite ws, etc.)
        if (
          text.includes('cloudflareinsights') ||
          text.includes('[vite]') ||
          text.includes('WebSocket') ||
          text.includes('Download the React DevTools')
        ) return;
        errors.push(`[console.error] ${text}`);
      }
    });
    return errors;
  };

  const assertNoReactCrash = (errors: string[]) => {
    const crashPatterns = [
      /Cannot update a component .* while rendering a different component/i,
      /Rendered (more|fewer) hooks than/i,
      /Invalid hook call/i,
      /Minified React error/i,
      /\[ErrorBoundary\] Caught error/i,
      /Maximum update depth exceeded/i,
      /useSyncExternalStore/i,
      /at WalletProviderInner/i,
      /at Hydrate/i,
    ];
    const crashes = errors.filter((e) => crashPatterns.some((p) => p.test(e)));
    if (crashes.length > 0) {
      throw new Error(
        `Detected React crash after search bar interaction:\n\n` +
          crashes.join('\n---\n'),
      );
    }
  };

  test('desktop: focus + type does not crash @e2e', async ({ page }) => {
    const errors = collectErrors(page);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for the desktop search input to appear (past splash screen).
    const search = page.locator('input[placeholder*="Search"]').first();
    await search.waitFor({ state: 'visible', timeout: 30000 });

    // 1) Click / focus — the reported crash trigger.
    await search.click();
    await page.waitForTimeout(500);
    assertNoReactCrash(errors);

    // 2) Type to trigger the debounced /api/search/* queries (these add
    // useSyncExternalStore subscribers via TanStack Query, which is the
    // class of subscription that previously raced with wagmi Hydrate).
    await search.fill('test');
    await page.waitForTimeout(1200); // > 300ms debounce + query roundtrip
    assertNoReactCrash(errors);

    // 3) Blur and re-focus to exercise the focus listener again.
    await page.keyboard.press('Escape');
    await search.click();
    await page.waitForTimeout(500);
    assertNoReactCrash(errors);

    expect(errors, `Unexpected console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('mobile: tap search icon opens overlay without crash @e2e', async ({ page }) => {
    const errors = collectErrors(page);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Mobile uses an icon that opens a portal overlay.
    const searchIcon = page.locator('button[aria-label*="earch" i], button:has(svg.lucide-search)').first();
    await searchIcon.waitFor({ state: 'visible', timeout: 30000 });

    await searchIcon.click();
    await page.waitForTimeout(500);
    assertNoReactCrash(errors);

    const overlayInput = page.locator('input[placeholder*="Search"]').first();
    await overlayInput.waitFor({ state: 'visible', timeout: 5000 });
    await overlayInput.fill('te');
    await page.waitForTimeout(1200);
    assertNoReactCrash(errors);

    expect(errors, `Unexpected console errors:\n${errors.join('\n')}`).toEqual([]);
  });
});
