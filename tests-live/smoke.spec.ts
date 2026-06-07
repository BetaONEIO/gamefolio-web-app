import { test, expect, Page } from '@playwright/test';

const PUBLIC_ROUTES = [
  { path: '/', name: 'home' },
  { path: '/trending', name: 'trending' },
  { path: '/explore', name: 'explore' },
  { path: '/leaderboard', name: 'leaderboard' },
  { path: '/auth', name: 'auth' },
  { path: '/terms', name: 'terms' },
  { path: '/privacy', name: 'privacy' },
  { path: '/contact', name: 'contact' },
  { path: '/help', name: 'help' },
];

type CapturedConsole = { type: string; text: string; url: string };
type FailedRequest = { url: string; status: number; resourceType: string };

function attachLoggers(page: Page) {
  const consoleErrors: CapturedConsole[] = [];
  const failedRequests: FailedRequest[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ type: msg.type(), text: msg.text(), url: page.url() });
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  page.on('response', (resp) => {
    const status = resp.status();
    if (status >= 400) {
      failedRequests.push({
        url: resp.url(),
        status,
        resourceType: resp.request().resourceType(),
      });
    }
  });

  return { consoleErrors, failedRequests, pageErrors };
}

const NOISY_CONSOLE_PATTERNS = [
  /MetaMask/i,
  /chrome-extension/i,
  /web3/i,
  /ethereum/i,
  /Failed to load resource: the server responded with a status of 401/i,
  /401 \(Unauthorized\)/i,
  /Failed to fetch dynamically imported module/i,
  /ResizeObserver loop/i,
];

const NOISY_REQUEST_PATTERNS = [
  /\/api\/auth\/me\b/,
  /\/api\/notifications\/unread\b/,
  /pagead2\.googlesyndication\.com/,
  /googletagmanager\.com/,
  /google-analytics\.com/,
];

function filterNoise<T extends { text?: string; url?: string }>(
  items: T[],
  textPatterns: RegExp[],
  urlPatterns: RegExp[],
): T[] {
  return items.filter((item) => {
    const text = item.text ?? '';
    const url = item.url ?? '';
    if (textPatterns.some((p) => p.test(text))) return false;
    if (urlPatterns.some((p) => p.test(url))) return false;
    return true;
  });
}

for (const route of PUBLIC_ROUTES) {
  test.describe(`route: ${route.path}`, () => {
    test(`loads with 2xx and Gamefolio title (${route.name})`, async ({ page }) => {
      const loggers = attachLoggers(page);
      const resp = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(resp, 'navigation response should exist').not.toBeNull();
      expect(resp!.status(), `top-level response status for ${route.path}`).toBeLessThan(400);
      await expect(page).toHaveTitle(/gamefolio/i);
      // Don't fail here on console/request issues — they're aggregated by other tests below.
      void loggers;
    });

    test(`renders an h1 after hydration (${route.name})`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'networkidle' });
      const h1Count = await page.locator('h1').count();
      expect(h1Count, `${route.path} should have at least one <h1> after hydration`).toBeGreaterThan(0);
    });

    test(`no critical static-asset 4xx/5xx (${route.name})`, async ({ page }) => {
      const { failedRequests } = attachLoggers(page);
      await page.goto(route.path, { waitUntil: 'networkidle' });
      const critical = filterNoise(failedRequests, [], NOISY_REQUEST_PATTERNS).filter(
        (r) => ['script', 'stylesheet', 'document', 'image', 'font'].includes(r.resourceType),
      );
      expect(critical, `${route.path} loaded with broken assets:\n${JSON.stringify(critical, null, 2)}`).toEqual([]);
    });

    test(`no uncaught page errors (${route.name})`, async ({ page }) => {
      const { pageErrors } = attachLoggers(page);
      await page.goto(route.path, { waitUntil: 'networkidle' });
      expect(pageErrors, `${route.path} threw uncaught errors:\n${pageErrors.join('\n')}`).toEqual([]);
    });

    test(`no unexpected console errors (${route.name})`, async ({ page }) => {
      const { consoleErrors } = attachLoggers(page);
      await page.goto(route.path, { waitUntil: 'networkidle' });
      const filtered = filterNoise(consoleErrors, NOISY_CONSOLE_PATTERNS, NOISY_REQUEST_PATTERNS);
      expect(filtered, `${route.path} had unexpected console errors:\n${filtered.map((e) => e.text).join('\n---\n')}`).toEqual([]);
    });
  });
}

test.describe('global a11y basics', () => {
  test('homepage images have alt attributes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const images = await page.locator('img').all();
    const missing: string[] = [];
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');
      if (alt === null) missing.push(src ?? '(no src)');
    }
    expect(missing, `Images missing alt attribute on /:\n${missing.join('\n')}`).toEqual([]);
  });

  test('homepage performs within budget', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'load' });
    const loadMs = Date.now() - start;
    expect(loadMs, `home /  load took ${loadMs}ms (budget: 8000ms)`).toBeLessThan(8000);
  });

  test('homepage has lang attribute set on <html>', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang, '<html lang> should be set for screen readers / SEO').toBeTruthy();
  });
});

test.describe('404 / unknown routes', () => {
  test('unknown route renders a NotFound page (does not throw)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    const resp = await page.goto('/this-route-does-not-exist-12345', {
      waitUntil: 'networkidle',
    });
    expect(resp, 'navigation response should exist').not.toBeNull();
    // SPA returns 200 with HTML shell; React renders NotFound. Either way no JS errors.
    expect(errors, `Unknown route threw uncaught errors:\n${errors.join('\n')}`).toEqual([]);
    // Page should have rendered SOMETHING — a body that isn't blank.
    const bodyText = (await page.locator('body').innerText()).trim();
    expect(bodyText.length, 'Body text on unknown route should not be empty').toBeGreaterThan(0);
  });
});

test.describe('mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14-ish

  test('homepage has no horizontal overflow on mobile', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const { scrollW, clientW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    // Allow 1px slack for sub-pixel rounding
    expect(scrollW, `mobile horizontal overflow: scrollWidth ${scrollW} > clientWidth ${clientW}`).toBeLessThanOrEqual(clientW + 1);
  });

  test('homepage h1 visible on mobile', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('h1').first()).toBeVisible();
  });
});

test.describe('security headers', () => {
  test('homepage response sets HSTS', async ({ request }) => {
    const resp = await request.get('/');
    const hsts = resp.headers()['strict-transport-security'];
    expect(hsts, 'Strict-Transport-Security header should be present').toBeTruthy();
  });

  test('homepage response sets X-Content-Type-Options: nosniff', async ({ request }) => {
    const resp = await request.get('/');
    const nosniff = resp.headers()['x-content-type-options'];
    expect(nosniff?.toLowerCase(), 'X-Content-Type-Options should be nosniff').toBe('nosniff');
  });

  test('homepage response sets a Referrer-Policy', async ({ request }) => {
    const resp = await request.get('/');
    const rp = resp.headers()['referrer-policy'];
    expect(rp, 'Referrer-Policy header should be set').toBeTruthy();
  });

  test('homepage response sets a frame-ancestors / X-Frame-Options', async ({ request }) => {
    const resp = await request.get('/');
    const xfo = resp.headers()['x-frame-options'];
    const csp = resp.headers()['content-security-policy'];
    const hasFrameDirective = !!xfo || /frame-ancestors/i.test(csp ?? '');
    expect(hasFrameDirective, 'Either X-Frame-Options or CSP frame-ancestors should be set to prevent clickjacking').toBe(true);
  });
});

test.describe('public infrastructure files', () => {
  test('robots.txt exists and is text/plain', async ({ request }) => {
    const resp = await request.get('/robots.txt');
    expect(resp.status(), '/robots.txt should return 200').toBe(200);
    const ct = resp.headers()['content-type'] ?? '';
    expect(ct, '/robots.txt should be text/plain').toMatch(/text\/plain/);
  });

  test('favicon resolves', async ({ request }) => {
    const resp = await request.get('/favicon.png');
    expect(resp.status(), '/favicon.png should return 200').toBe(200);
  });
});

test.describe('legal page consistency', () => {
  test('terms route content is non-trivial', async ({ page }) => {
    await page.goto('/terms', { waitUntil: 'networkidle' });
    const text = (await page.locator('main, body').first().innerText()).trim();
    expect(text.length, 'Terms page should render substantial text content (>200 chars)').toBeGreaterThan(200);
  });

  test('privacy route content is non-trivial', async ({ page }) => {
    await page.goto('/privacy', { waitUntil: 'networkidle' });
    const text = (await page.locator('main, body').first().innerText()).trim();
    expect(text.length, 'Privacy page should render substantial text content (>200 chars)').toBeGreaterThan(200);
  });
});

test.describe('homepage link integrity', () => {
  test('all internal links from homepage resolve to 2xx/3xx', async ({ page, request }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const hrefs = await page.locator('a[href]').evaluateAll((els) =>
      Array.from(new Set(
        els
          .map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? '')
          .filter((h) => h && (h.startsWith('/') || h.startsWith(location.origin)))
          .map((h) => (h.startsWith('/') ? h : new URL(h).pathname))
          .filter((h) => !h.startsWith('/api/') && !h.includes('#'))
      ))
    );
    const broken: { href: string; status: number }[] = [];
    for (const href of hrefs) {
      const resp = await request.get(href, { failOnStatusCode: false, maxRedirects: 5 });
      if (resp.status() >= 400) broken.push({ href, status: resp.status() });
    }
    expect(broken, `Broken internal links from homepage:\n${JSON.stringify(broken, null, 2)}`).toEqual([]);
  });
});
