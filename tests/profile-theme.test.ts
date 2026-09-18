import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PROFILE_THEME,
  PROFILE_THEMES,
  resolveProfileTheme,
} from "../shared/profile-theme";

test("every catalog theme resolves to its own visual definition", () => {
  const slugs = PROFILE_THEMES.map((theme) => theme.slug);
  assert.equal(new Set(slugs).size, slugs.length, "theme slugs must be unique");

  const visualSignatures = PROFILE_THEMES.map((theme) => [
    theme.backgroundColor,
    theme.primaryColor,
    theme.accentColor,
    theme.avatarBorderColor,
    theme.profileBackgroundGradientCss,
    theme.patternCss,
    theme.animation,
  ].join("|"));
  assert.equal(
    new Set(visualSignatures).size,
    visualSignatures.length,
    "every theme must have a distinct visual signature",
  );

  for (const theme of PROFILE_THEMES) {
    const resolved = resolveProfileTheme({
      profileBackgroundTheme: theme.slug,
      backgroundColor: theme.backgroundColor,
      primaryColor: theme.primaryColor,
      accentColor: theme.accentColor,
    });

    assert.equal(resolved.theme?.slug, theme.slug);
    assert.equal(resolved.backgroundColor, theme.backgroundColor);
    assert.equal(resolved.primaryColor, theme.primaryColor);
    assert.equal(resolved.accentColor, theme.accentColor);
    assert.equal(theme.tokens.background, theme.backgroundColor);
    assert.equal(theme.tokens.surface, theme.cardColor);
    assert.equal(theme.tokens.accent, theme.accentColor);
    assert.equal(theme.assets.backgroundAnimation, theme.animation);
    assert.equal(theme.assets.decorativeOverlay, theme.patternCss);
  }
});

test("representative theme categories preserve their intended contrast and motion", () => {
  const dark = resolveProfileTheme({ profileBackgroundTheme: "void" }).theme;
  const light = resolveProfileTheme({ profileBackgroundTheme: "ice" }).theme;
  const patterned = resolveProfileTheme({ profileBackgroundTheme: "cyber-city" }).theme;
  const animated = resolveProfileTheme({ profileBackgroundTheme: "legendary-drop" }).theme;

  assert.equal(dark?.light, undefined);
  assert.equal(light?.light, true);
  assert.notEqual(dark?.tokens.text, light?.tokens.text);
  assert.notEqual(dark?.tokens.surface, light?.tokens.surface);
  assert.notEqual(patterned?.patternCss, "none");
  assert.equal(animated?.animation, "spark");
  assert.equal(animated?.assets.backgroundAnimation, "spark");
});

test("default theme reset restores the canonical profile palette", () => {
  const resolved = resolveProfileTheme({
    profileBackgroundTheme: "default",
    backgroundColor: DEFAULT_PROFILE_THEME.backgroundColor,
    primaryColor: DEFAULT_PROFILE_THEME.primaryColor,
    accentColor: DEFAULT_PROFILE_THEME.accentColor,
  });

  assert.equal(resolved.theme?.slug, "default");
  assert.equal(resolved.backgroundColor, "#0A0A10");
  assert.equal(resolved.primaryColor, "#0A0A10");
  assert.equal(resolved.cardColor, "#1A1D2B");
  assert.equal(resolved.accentColor, "#B7FF18");
});