export const NEON = "#B7FF18";
export const CARD_BG = "rgba(255,255,255,0.04)";
export const CARD_BORDER = "rgba(255,255,255,0.09)";
export const PAGE_BG = "#070b10";

// Indie Dashboard palette. Keep dashboard UI chrome on this palette so tabs
// cannot drift into unrelated per-feature accent colours.
export const DASHBOARD_THEME = {
  accent: NEON,
  accentRgb: "183,255,24",
  page: PAGE_BG,
  surface: CARD_BG,
  surfaceRaised: "rgba(255,255,255,0.06)",
  surfaceSubtle: "rgba(255,255,255,0.02)",
  border: CARD_BORDER,
  borderSubtle: "rgba(255,255,255,0.06)",
  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.5)",
  textSubtle: "rgba(255,255,255,0.3)",
  success: NEON,
  warning: "#d8b24c",
  danger: "#e66b73",
  info: "#8cc4d9",
} as const;

export const rgbaAccent = (alpha: number) => `rgba(${DASHBOARD_THEME.accentRgb},${alpha})`;
