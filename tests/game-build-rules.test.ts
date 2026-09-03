import { test, expect } from '@playwright/test';
import {
  validateBuildUpload,
  quotaFor,
  FREE_QUOTA,
  SUBSCRIBER_QUOTA,
  WEB_BUILD_MAX_BYTES,
  hasBuildHosting,
  formatBytes,
} from '../shared/game-builds';
import { safeRelativePath, findEntryPoint } from '../server/services/game-build-extractor';

// Pins the two decisions that keep hosted game builds safe and affordable:
// the quota/type rules the upload form and the server both run, and the path
// sanitiser that stands between an uploaded archive and writing outside its
// own prefix in R2.

const MB = 1024 * 1024;
const GB = 1024 * MB;
const noUsage = { usedBytes: 0, buildsOnGame: 0 };

test.describe('validateBuildUpload @unit', () => {
  test('refuses any build without the subscription', () => {
    // Hosting is a Game Developer Pro feature outright — a non-subscriber is
    // refused before build type, size or extension is even considered.
    for (const req of [
      { buildType: 'web' as const, fileName: 'game.zip', sizeBytes: 40 * MB },
      { buildType: 'download' as const, platform: 'windows' as const, fileName: 'game.zip', sizeBytes: 10 * MB },
    ]) {
      expect(validateBuildUpload(req, noUsage, FREE_QUOTA)).toContain('Game Developer Pro');
    }
  });

  test('accepts a normal web build for a subscriber', () => {
    expect(validateBuildUpload(
      { buildType: 'web', fileName: 'game.zip', sizeBytes: 40 * MB },
      noUsage, SUBSCRIBER_QUOTA,
    )).toBeNull();
  });

  test('allows downloadable builds for a subscriber', () => {
    expect(validateBuildUpload(
      { buildType: 'download', platform: 'windows', fileName: 'game.zip', sizeBytes: 2 * GB },
      noUsage, SUBSCRIBER_QUOTA,
    )).toBeNull();
  });

  test('a download build must declare a platform', () => {
    expect(validateBuildUpload(
      { buildType: 'download', platform: null, fileName: 'game.zip', sizeBytes: 10 * MB },
      noUsage, SUBSCRIBER_QUOTA,
    )).toContain('platform');
  });

  test('web builds are capped below the tier limit even for subscribers', () => {
    // The server has to expand these, so the extraction cap wins over the
    // (much larger) subscriber per-build cap.
    const error = validateBuildUpload(
      { buildType: 'web', fileName: 'game.zip', sizeBytes: WEB_BUILD_MAX_BYTES + 1 },
      noUsage, SUBSCRIBER_QUOTA,
    );
    expect(error).toContain('Browser-playable');
  });

  test('rejects a file that would exceed the account quota', () => {
    const error = validateBuildUpload(
      { buildType: 'download', platform: 'mac', fileName: 'game.zip', sizeBytes: 2 * GB },
      { usedBytes: SUBSCRIBER_QUOTA.accountBytes - GB, buildsOnGame: 0 },
      SUBSCRIBER_QUOTA,
    );
    expect(error).toContain('build storage');
  });

  test('rejects once the per-game build count is used up', () => {
    const error = validateBuildUpload(
      { buildType: 'web', fileName: 'game.zip', sizeBytes: 1 * MB },
      { usedBytes: 0, buildsOnGame: SUBSCRIBER_QUOTA.maxBuildsPerGame },
      SUBSCRIBER_QUOTA,
    );
    expect(error).toContain('per game');
  });

  test('rejects a non-archive extension', () => {
    expect(validateBuildUpload(
      { buildType: 'download', platform: 'windows', fileName: 'game.exe', sizeBytes: 10 * MB },
      noUsage, SUBSCRIBER_QUOTA,
    )).toContain('archive');
  });

  test('quotaFor maps the subscription flag to the right ceiling', () => {
    expect(quotaFor(false).accountBytes).toBe(FREE_QUOTA.accountBytes);
    expect(quotaFor(true).accountBytes).toBe(SUBSCRIBER_QUOTA.accountBytes);
  });

  test('the free quota grants no hosting at all', () => {
    expect(hasBuildHosting(FREE_QUOTA)).toBe(false);
    expect(hasBuildHosting(SUBSCRIBER_QUOTA)).toBe(true);
  });
});

test.describe('safeRelativePath zip-slip @unit', () => {
  test('keeps an ordinary nested path', () => {
    expect(safeRelativePath('Build/index.html')).toBe('Build/index.html');
  });

  test('normalises Windows separators', () => {
    expect(safeRelativePath('Build\\data\\game.wasm')).toBe('Build/data/game.wasm');
  });

  test('drops redundant segments without changing the target', () => {
    expect(safeRelativePath('./Build/./index.html')).toBe('Build/index.html');
  });

  test('refuses traversal rather than resolving it', () => {
    expect(safeRelativePath('../../../etc/passwd')).toBeNull();
    expect(safeRelativePath('Build/../../escape.txt')).toBeNull();
  });

  test('refuses absolute, UNC and drive-letter paths', () => {
    expect(safeRelativePath('/etc/passwd')).toBeNull();
    expect(safeRelativePath('//server/share/x')).toBeNull();
    expect(safeRelativePath('C:/Windows/system32/x.dll')).toBeNull();
  });

  test('refuses control characters in a segment', () => {
    expect(safeRelativePath('Build/bad\u0000name.txt')).toBeNull();
  });

  test('refuses an empty result', () => {
    expect(safeRelativePath('./')).toBeNull();
    expect(safeRelativePath('')).toBeNull();
  });
});

test.describe('findEntryPoint @unit', () => {
  test('prefers a top-level index.html', () => {
    expect(findEntryPoint(['index.html', 'Build/other.html'])).toBe('index.html');
  });

  test('handles an export wrapped in a single folder', () => {
    expect(findEntryPoint(['MyGame/index.html', 'MyGame/Build/game.wasm']))
      .toBe('MyGame/index.html');
  });

  test('falls back to the shallowest html when nothing is named index', () => {
    expect(findEntryPoint(['MyGame/play.html', 'MyGame/deep/nested/other.html']))
      .toBe('MyGame/play.html');
  });

  test('returns null when there is no html at all', () => {
    expect(findEntryPoint(['Build/game.wasm', 'readme.txt'])).toBeNull();
  });
});

test.describe('formatBytes @unit', () => {
  test('reads naturally at each scale', () => {
    expect(formatBytes(500 * MB)).toBe('500 MB');
    expect(formatBytes(2 * GB)).toBe('2.0 GB');
    expect(formatBytes(20 * GB)).toBe('20 GB');
  });
});
