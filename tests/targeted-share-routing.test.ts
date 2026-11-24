import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

interface HandlerContract {
  path: string;
  start: string;
  end: string;
}

interface TargetHandlerContract extends HandlerContract {
  openPattern: RegExp;
  wiringPattern: RegExp;
}

async function readSource(path: string): Promise<string> {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

async function readHandler({ path, start, end }: HandlerContract): Promise<string> {
  const source = await readSource(path);
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  assert.ok(startIndex >= 0, `expected ${start} in ${path}`);
  assert.ok(endIndex > startIndex, `expected ${end} after ${start} in ${path}`);
  return source.slice(startIndex, endIndex);
}

const explicitTargetHandlers: TargetHandlerContract[] = [
  {
    path: 'client/src/components/clip/ClipShareDialog.tsx',
    start: 'const handleSocialShare',
    end: 'const hasNativeShare',
    openPattern: /openShareWindow\(url\)/,
    wiringPattern: /handleSocialShare\(platform\.name, shareUrl, platform\.key\)/,
  },
  {
    path: 'client/src/components/screenshot/ScreenshotShareDialog.tsx',
    start: 'const handleSocialShare',
    end: 'const hasNativeShare',
    openPattern: /openShareWindow\(url\)/,
    wiringPattern: /handleSocialShare\(platform\.name, shareUrl, platform\.key\)/,
  },
  {
    path: 'client/src/components/clips/QuickShareButton.tsx',
    start: 'const handleShareClick',
    end: 'return (',
    openPattern: /openShareWindow\(platform\.url!\)/,
    wiringPattern: /onClick=\{\(e\) => handleShareClick\(platform, e\)\}/,
  },
  {
    path: 'client/src/components/clips/ShareMenu.tsx',
    start: 'const handleShareClick',
    end: 'return (',
    openPattern: /openShareWindow\(url\)/,
    wiringPattern: /handleShareClick\(twitterUrl, 'X'\)/,
  },
  {
    path: 'client/src/pages/PostUploadSuccessPage.tsx',
    start: 'const handleSocialShare',
    end: 'const handleUploadMore',
    openPattern: /openShareWindow\(url\)/,
    wiringPattern: /handleSocialShare\('twitter', uploadedContent\.socialMediaLinks!\.twitter\)/,
  },
  {
    path: 'client/src/components/profile/GameShareDialog.tsx',
    start: 'const handleSocialShare',
    end: 'return (',
    openPattern: /openShareWindow\(getSocialShareUrl\(platformKey, gameName, shareUrl\)\)/,
    wiringPattern: /handleSocialShare\(platform\.key, platform\.name\)/,
  },
  {
    path: 'client/src/components/profile/GamefolioShareDialog.tsx',
    start: 'const handleSocialShare',
    end: 'const socialPlatforms',
    openPattern: /openShareWindow\(url\)/,
    wiringPattern: /handleSocialShare\(shareUrl, platform\.key, platform\.name\)/,
  },
];

test('explicit social targets open their own composer instead of the generic share sheet', async () => {
  for (const contract of explicitTargetHandlers) {
    const handler = await readHandler(contract);
    const source = await readSource(contract.path);
    assert.match(handler, contract.openPattern, `${contract.path} should open the provided target intent`);
    assert.match(source, contract.wiringPattern, `${contract.path} should wire its target button to the handler`);
    assert.doesNotMatch(handler, /\bnativeShare(?:WithStatus)?\(/, `${contract.path} must not open the app chooser`);
    assert.doesNotMatch(handler, /\bisNative\b/, `${contract.path} must behave the same on iOS and Android`);
  }
});

const copyOnlyHandlers: HandlerContract[] = [
  {
    path: 'client/src/components/clip/ClipShareDialog.tsx',
    start: 'const handleCopyOnlyShare',
    end: 'const handleSocialShare',
  },
  {
    path: 'client/src/components/screenshot/ScreenshotShareDialog.tsx',
    start: 'const handleCopyOnlyShare',
    end: 'const handleSocialShare',
  },
  {
    path: 'client/src/components/clips/ShareMenu.tsx',
    start: 'const handleCopyOnlyShare',
    end: 'const handleGenericShare',
  },
];

test('copy-only social targets copy the link without opening the app chooser', async () => {
  for (const contract of copyOnlyHandlers) {
    const handler = await readHandler(contract);
    assert.match(handler, /clipboard\.writeText\(/, `${contract.path} should copy the link`);
    assert.doesNotMatch(handler, /\bnativeShare(?:WithStatus)?\(/, `${contract.path} must not open the app chooser`);
    assert.doesNotMatch(handler, /\bisNative\b/, `${contract.path} should copy on native and web`);
  }
});

test('inline copy-only branches return before any target composer opens', async () => {
  for (const contract of [
    {
      path: 'client/src/pages/PostUploadSuccessPage.tsx',
      start: 'const handleSocialShare',
      end: 'const handleUploadMore',
      branch: "if (platform === 'discord')",
      copy: 'navigator.clipboard.writeText',
    },
    {
      path: 'client/src/components/profile/GameShareDialog.tsx',
      start: 'const handleSocialShare',
      end: 'return (',
      branch: 'if (copyOnlyPlatforms.includes(platformKey))',
      copy: 'await copyLink',
    },
    {
      path: 'client/src/components/profile/GamefolioShareDialog.tsx',
      start: 'const handleSocialShare',
      end: 'const socialPlatforms',
      branch: 'if (COPY_ONLY.includes(platformKey))',
      copy: 'navigator.clipboard.writeText',
    },
  ]) {
    const handler = await readHandler(contract);
    const branchIndex = handler.indexOf(contract.branch);
    const copyIndex = handler.indexOf(contract.copy, branchIndex);
    const returnIndex = handler.indexOf('return;', copyIndex);
    const openIndex = handler.indexOf('openShareWindow(', returnIndex);

    assert.ok(branchIndex >= 0, `expected a copy-only branch in ${contract.path}`);
    assert.ok(copyIndex > branchIndex, `expected ${contract.path} to copy inside that branch`);
    assert.ok(returnIndex > copyIndex, `expected ${contract.path} to return after copying`);
    assert.ok(openIndex > returnIndex, `expected ${contract.path} to open composers only after the copy branch`);
    assert.doesNotMatch(handler, /\bnativeShare(?:WithStatus)?\(/, `${contract.path} must not open the app chooser`);
  }
});

test('generic Share actions retain the native share sheet', async () => {
  for (const contract of [
    {
      path: 'client/src/components/clip/ClipShareDialog.tsx',
      start: 'const handleNativeShare',
      end: 'const handleCopyOnlyShare',
    },
    {
      path: 'client/src/components/screenshot/ScreenshotShareDialog.tsx',
      start: 'const handleNativeShare',
      end: 'const handleCopyOnlyShare',
    },
    {
      path: 'client/src/components/shared/ShareDialog.tsx',
      start: 'const handleShare',
      end: 'return (',
    },
    {
      path: 'client/src/components/clips/QuickShareButton.tsx',
      start: 'const handleMoreShare',
      end: 'const handleShareClick',
    },
    {
      path: 'client/src/components/clips/ShareMenu.tsx',
      start: 'const handleGenericShare',
      end: 'const handleShareClick',
    },
  ]) {
    const handler = await readHandler(contract);
    assert.match(handler, /\bnativeShare(?:WithStatus)?\(/, `${contract.path} should retain generic device sharing`);
  }

  for (const path of [
    'client/src/components/clip/ClipShareDialog.tsx',
    'client/src/components/screenshot/ScreenshotShareDialog.tsx',
  ]) {
    const source = await readSource(path);
    assert.match(source, /hasNativeShare = isNative \|\|/, `${path} should expose generic sharing in native WebViews`);
    assert.match(source, /onClick=\{handleNativeShare\}/, `${path} should wire Share via to native sharing`);
  }

  const sharedDialog = await readSource('client/src/components/shared/ShareDialog.tsx');
  assert.match(sharedDialog, /onClick=\{handleShare\}/);
  assert.match(sharedDialog, /if \(!handled\) void openShareWindow/, 'target fallback should run only when generic sharing is unavailable');
});

test('cancelling a generic share does not trigger share tracking', async () => {
  for (const contract of [
    {
      path: 'client/src/components/clip/ClipShareDialog.tsx',
      start: 'const handleNativeShare',
      end: 'const handleCopyOnlyShare',
    },
    {
      path: 'client/src/components/screenshot/ScreenshotShareDialog.tsx',
      start: 'const handleNativeShare',
      end: 'const handleCopyOnlyShare',
    },
  ]) {
    const handler = await readHandler(contract);
    assert.match(handler, /nativeShareWithStatus\(/);
    assert.match(handler, /if \(status === 'shared'\) trackShare\(\)/);
  }

  const platform = await readSource('client/src/lib/platform.ts');
  assert.match(platform, /if \(\/cancel\/i\.test\(name\)\) return 'cancelled'/);
  assert.match(platform, /if \(\(err as Error\)\?\.name === 'AbortError'\) return 'cancelled'/);
});

test('Gamefolio fallback data keeps Threads as a targeted composer', async () => {
  const source = await readSource('client/src/components/profile/GamefolioShareDialog.tsx');
  assert.match(source, /threads: `https:\/\/www\.threads\.net\/intent\/post\?text=/);
  assert.doesNotMatch(source, /const COPY_ONLY = \[[^\]]*"threads"/);
});
