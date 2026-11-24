import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pickerPath = new URL('../client/src/components/clips/GamePickerSheet.tsx', import.meta.url);
const rawgServicePath = new URL('../server/services/rawg-service.ts', import.meta.url);
const gameRoutesPath = new URL('../server/routes/twitch-games.ts', import.meta.url);

test('upload game picker ranks popular games first', async () => {
  const [pickerSource, rawgSource, gameRoutesSource] = await Promise.all([
    readFile(pickerPath, 'utf8'),
    readFile(rawgServicePath, 'utf8'),
    readFile(gameRoutesPath, 'utf8'),
  ]);

  assert.match(pickerSource, /fetch\("\/api\/game-catalog\/popular\?limit=30"\)/);
  assert.match(gameRoutesSource, /router\.get\('\/game-catalog\/popular'/);
  assert.match(gameRoutesSource, /rawgService\.getPopularGames\(limit\)/);
  assert.match(rawgSource, /return this\.getRankedGames\(limit, '-added', 'popular'\)/);

  const popularRequest = rawgSource.slice(
    rawgSource.indexOf('async getPopularGames'),
    rawgSource.indexOf('async getPopularGames') + 700,
  );
  assert.doesNotMatch(popularRequest, /dates:/);

  const popularSectionIndex = pickerSource.indexOf('"popular-games-section"');
  const personalSectionIndex = pickerSource.indexOf('data-testid="your-games-section"');
  assert.ok(popularSectionIndex >= 0, 'popular games section should exist');
  assert.ok(personalSectionIndex > popularSectionIndex, 'popular games should render before personal games');

  const gameCardsIndex = pickerSource.indexOf('(popularGames || [])).map');
  const addGameIndex = pickerSource.indexOf('data-testid="add-custom-game"');
  assert.ok(gameCardsIndex >= 0, 'popular game cards should render');
  assert.ok(addGameIndex > gameCardsIndex, 'popular game cards should appear before the add-game action');
});

test('mobile Search action runs the query without submitting the upload form', async () => {
  const pickerSource = await readFile(pickerPath, 'utf8');

  assert.match(pickerSource, /type="search"/);
  assert.match(pickerSource, /enterKeyHint="search"/);
  assert.match(pickerSource, /onKeyDown=\{handleSearchKeyDown\}/);

  const enterHandler = pickerSource.slice(
    pickerSource.indexOf('const handleSearchKeyDown'),
    pickerSource.indexOf('const handleCreateCustomGame'),
  );
  assert.match(enterHandler, /event\.key !== "Enter"/);
  assert.match(enterHandler, /event\.preventDefault\(\)/);
  assert.match(enterHandler, /event\.stopPropagation\(\)/);
  assert.match(enterHandler, /searchQuery\.trim\(\)/);
  assert.match(enterHandler, /setDebouncedQuery\(normalizedQuery\)/);
  assert.ok(
    enterHandler.indexOf('event.preventDefault()') < enterHandler.indexOf('event.nativeEvent.isComposing'),
    'Enter must be cancelled before an in-progress IME composition is ignored',
  );

  assert.match(pickerSource, /if \(!open\) \{[\s\S]*setSearchQuery\(""\);[\s\S]*setDebouncedQuery\(""\);/);

  const buttons = pickerSource.match(/<button\b[\s\S]*?>/g) ?? [];
  assert.ok(buttons.length > 0, 'picker should contain button controls');
  for (const button of buttons) {
    assert.match(button, /type="button"/, `picker button can submit the parent upload form: ${button}`);
  }
});
