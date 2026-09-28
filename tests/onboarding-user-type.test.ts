import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOnboardingUserType,
  isGamingOnboardingPath,
  ONBOARDING_FAVORITE_GAMES_MAX,
  ONBOARDING_FAVORITE_GAMES_MIN,
  toggleOnboardingGameSelection,
} from "../shared/onboarding";

test("available onboarding paths preserve their user types", () => {
  assert.equal(isGamingOnboardingPath("gamer"), true);
  assert.equal(isGamingOnboardingPath("streamer"), false);
  assert.equal(isGamingOnboardingPath("indie"), false);
  assert.equal(isGamingOnboardingPath(null), false);
  assert.equal(buildOnboardingUserType("gamer"), "gamer");
  assert.equal(buildOnboardingUserType("gamer", ["gamer", "competitive"]), "gamer,competitive");
  assert.equal(buildOnboardingUserType("streamer"), "streamer");
  assert.equal(buildOnboardingUserType("indie"), "indie_developer");
});

test("favorite game selection respects the five-game limit and allows replacements", () => {
  const games: Array<{ id: number; name: string }> = Array.from(
    { length: ONBOARDING_FAVORITE_GAMES_MAX + 1 },
    (_, id) => ({
    id,
    name: `Game ${id}`,
    }),
  );
  let selected: Array<{ id: number; name: string }> = [];

  let result = toggleOnboardingGameSelection(selected, games[0]);
  selected = result.selectedGames;
  assert.equal(selected.length, ONBOARDING_FAVORITE_GAMES_MIN);
  assert.equal(result.limitReached, false);

  for (const game of games.slice(1, ONBOARDING_FAVORITE_GAMES_MAX)) {
    result = toggleOnboardingGameSelection(selected, game);
    selected = result.selectedGames;
  }
  assert.equal(selected.length, ONBOARDING_FAVORITE_GAMES_MAX);

  result = toggleOnboardingGameSelection(selected, games[ONBOARDING_FAVORITE_GAMES_MAX]);
  assert.equal(result.limitReached, true);
  assert.equal(result.selectedGames.length, ONBOARDING_FAVORITE_GAMES_MAX);

  result = toggleOnboardingGameSelection(selected, games[1]);
  selected = result.selectedGames;
  assert.equal(selected.length, ONBOARDING_FAVORITE_GAMES_MAX - 1);
  assert.equal(selected.some((game) => game.id === games[1].id), false);

  result = toggleOnboardingGameSelection(selected, games[ONBOARDING_FAVORITE_GAMES_MAX]);
  assert.equal(result.limitReached, false);
  assert.equal(result.selectedGames.length, ONBOARDING_FAVORITE_GAMES_MAX);
  assert.equal(
    result.selectedGames.some((game) => game.id === games[ONBOARDING_FAVORITE_GAMES_MAX].id),
    true,
  );
});