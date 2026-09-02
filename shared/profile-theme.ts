export const DEFAULT_PROFILE_THEME = {
  backgroundColor: "#0F101B",
  primaryColor: "#0F101B",
  bannerColor: "#171A27",
  cardColor: "#1A1D2B",
  accentColor: "#B7FF18",
  avatarBorderColor: "#B7FF18",
} as const;

const LEGACY_DEFAULT_BACKGROUNDS = new Set(["#0b2232", "#121f2b", "#071013"]);
const LEGACY_DEFAULT_ACCENTS = new Set(["#b7ff1a", "#4ade80"]);
const LEGACY_DEFAULT_PRIMARY_COLORS = new Set(["#02172c", "#071013", "#0b1218"]);
const LEGACY_DEFAULT_CARD_COLORS = new Set(["#1e3a8a"]);
const LEGACY_DEFAULT_AVATAR_BORDERS = new Set(["#4ade80", "#b7ff1a"]);

type ProfileThemeValues = {
  backgroundColor?: string | null;
  primaryColor?: string | null;
  cardColor?: string | null;
  accentColor?: string | null;
  avatarBorderColor?: string | null;
  profileBackgroundImageUrl?: string | null;
  profileBackgroundGradientCss?: string | null;
};

const normalise = (value?: string | null) => value?.trim().toLowerCase() || "";

export function isLegacyDefaultProfileTheme(profile: ProfileThemeValues): boolean {
  if (profile.profileBackgroundImageUrl?.trim() || profile.profileBackgroundGradientCss?.trim()) {
    return false;
  }

  const background = normalise(profile.backgroundColor);
  const accent = normalise(profile.accentColor);
  const primary = normalise(profile.primaryColor);

  return (
    (!background || LEGACY_DEFAULT_BACKGROUNDS.has(background)) &&
    (!accent || LEGACY_DEFAULT_ACCENTS.has(accent)) &&
    (!primary || LEGACY_DEFAULT_PRIMARY_COLORS.has(primary))
  );
}

export function resolveProfileTheme(profile: ProfileThemeValues) {
  const hasCustomBackground =
    !!profile.profileBackgroundImageUrl?.trim() || !!profile.profileBackgroundGradientCss?.trim();
  const isCurrentDefault =
    !hasCustomBackground &&
    normalise(profile.backgroundColor) === DEFAULT_PROFILE_THEME.backgroundColor.toLowerCase() &&
    normalise(profile.accentColor) === DEFAULT_PROFILE_THEME.accentColor.toLowerCase() &&
    normalise(profile.primaryColor) === DEFAULT_PROFILE_THEME.primaryColor.toLowerCase();

  if (!isLegacyDefaultProfileTheme(profile) && !isCurrentDefault) {
    return {
      backgroundColor: profile.backgroundColor || DEFAULT_PROFILE_THEME.backgroundColor,
      primaryColor: profile.primaryColor || DEFAULT_PROFILE_THEME.primaryColor,
      bannerColor: profile.primaryColor || DEFAULT_PROFILE_THEME.bannerColor,
      cardColor: profile.cardColor || DEFAULT_PROFILE_THEME.cardColor,
      accentColor: profile.accentColor || DEFAULT_PROFILE_THEME.accentColor,
      avatarBorderColor: profile.avatarBorderColor || profile.accentColor || DEFAULT_PROFILE_THEME.avatarBorderColor,
    };
  }

  return {
    backgroundColor: DEFAULT_PROFILE_THEME.backgroundColor,
    primaryColor: DEFAULT_PROFILE_THEME.primaryColor,
    bannerColor: DEFAULT_PROFILE_THEME.bannerColor,
    cardColor:
      !profile.cardColor || LEGACY_DEFAULT_CARD_COLORS.has(normalise(profile.cardColor))
        ? DEFAULT_PROFILE_THEME.cardColor
        : profile.cardColor,
    accentColor: DEFAULT_PROFILE_THEME.accentColor,
    avatarBorderColor:
      !profile.avatarBorderColor || LEGACY_DEFAULT_AVATAR_BORDERS.has(normalise(profile.avatarBorderColor))
        ? DEFAULT_PROFILE_THEME.avatarBorderColor
        : profile.avatarBorderColor,
  };
}