export const SEASON_DEFS = [
  { num: 9, name: "Autumn Assault", icon: "flame", dateRange: "Sep – Nov 2026", months: ["2026-09", "2026-10", "2026-11"] },
  { num: 8, name: "Summer Showdown", icon: "sun", dateRange: "Jun – Aug 2026", months: ["2026-06", "2026-07", "2026-08"] },
  { num: 7, name: "Spring Clash", icon: "leaf", dateRange: "Mar – May 2026", months: ["2026-03", "2026-04", "2026-05"] },
  { num: 6, name: "Winter Warzone", icon: "snow", dateRange: "Dec 2025 – Feb 2026", months: ["2025-12", "2026-01", "2026-02"] },
  { num: 5, name: "Autumn Assault", icon: "flame", dateRange: "Sep – Nov 2025", months: ["2025-09", "2025-10", "2025-11"] },
  { num: 4, name: "Summer Heat", icon: "sun", dateRange: "Jun – Aug 2025", months: ["2025-06", "2025-07", "2025-08"] },
  { num: 3, name: "Spring Surge", icon: "leaf", dateRange: "Mar – May 2025", months: ["2025-03", "2025-04", "2025-05"] },
] as const;

export type SeasonDefinition = (typeof SEASON_DEFS)[number];