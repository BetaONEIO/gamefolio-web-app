export const DEFAULT_PROFILE_THEME = {
  backgroundColor: "#0F101B",
  primaryColor: "#0F101B",
  bannerColor: "#171A27",
  cardColor: "#1A1D2B",
  accentColor: "#B7FF18",
  avatarBorderColor: "#B7FF18",
} as const;

export type ProfileThemeRarity = "starter" | "rare" | "epic" | "legendary";
export type ProfileThemeAnimation =
  | "none"
  | "drift"
  | "scan"
  | "pulse"
  | "rain"
  | "snow"
  | "flicker"
  | "spark";

export interface ProfileThemeDefinition {
  slug: string;
  name: string;
  description: string;
  rarity: ProfileThemeRarity;
  backgroundColor: string;
  primaryColor: string;
  bannerColor: string;
  cardColor: string;
  accentColor: string;
  avatarBorderColor: string;
  gradientTopColor: string;
  profileBackgroundGradientCss: string;
  patternCss: string;
  animation: ProfileThemeAnimation;
  previewGlyph: string;
  tokens: {
    background: string;
    surface: string;
    surfaceSecondary: string;
    text: string;
    textSecondary: string;
    accent: string;
    accentSecondary: string;
    border: string;
    buttonBg: string;
    buttonText: string;
    statsBg: string;
    statsText: string;
    tagBg: string;
    tagText: string;
  };
  assets: {
    backgroundImage: string;
    backgroundAnimation: ProfileThemeAnimation;
    decorativeOverlay: string;
    particleEffect: ProfileThemeAnimation;
    statsDecoration: string;
    buttonStyle: "solid" | "paper" | "hud";
    collectionTabStyle: "accent-outline";
    profileBorder: "independent";
  };
  proOnly?: boolean;
  unlockRewardName?: string;
  light?: boolean;
  fontFamily?: string;
}

type ThemeSpec = Omit<ProfileThemeDefinition, "slug" | "bannerColor" | "cardColor" | "gradientTopColor" | "profileBackgroundGradientCss" | "tokens" | "assets"> & {
  slug: string;
  surface?: string;
  banner?: string;
  gradient?: string;
};

const makeTheme = (spec: ThemeSpec): ProfileThemeDefinition => {
  const surface = spec.surface || spec.backgroundColor;
  const gradient = spec.gradient || `linear-gradient(145deg, ${spec.primaryColor} 0%, ${spec.backgroundColor} 72%)`;
  const text = spec.light ? "#172033" : "#f8fafc";
  const textSecondary = spec.light ? "#475569" : "#cbd5e1";
  const buttonText = spec.light ? "#172033" : "#071018";
  return {
    ...spec,
    bannerColor: spec.banner || spec.primaryColor,
    cardColor: surface,
    gradientTopColor: spec.primaryColor,
    profileBackgroundGradientCss: gradient,
    tokens: {
      background: spec.backgroundColor,
      surface,
      surfaceSecondary: spec.primaryColor,
      text,
      textSecondary,
      accent: spec.accentColor,
      accentSecondary: spec.avatarBorderColor,
      border: `${spec.accentColor}55`,
      buttonBg: spec.accentColor,
      buttonText,
      statsBg: surface,
      statsText: text,
      tagBg: spec.accentColor,
      tagText: buttonText,
    },
    assets: {
      backgroundImage: gradient,
      backgroundAnimation: spec.animation,
      decorativeOverlay: spec.patternCss,
      particleEffect: spec.animation,
      statsDecoration: spec.patternCss,
      buttonStyle: spec.fontFamily ? "hud" : (spec.light ? "paper" : "solid"),
      collectionTabStyle: "accent-outline",
      profileBorder: "independent",
    },
  };
};

const starterTheme = makeTheme({
  slug: "default",
  name: "None",
  description: "The classic Gamefolio look.",
  rarity: "starter",
  backgroundColor: DEFAULT_PROFILE_THEME.backgroundColor,
  primaryColor: DEFAULT_PROFILE_THEME.primaryColor,
  accentColor: DEFAULT_PROFILE_THEME.accentColor,
  avatarBorderColor: DEFAULT_PROFILE_THEME.avatarBorderColor,
  patternCss: "none",
  animation: "none",
  previewGlyph: "GF",
});

// The catalog is deliberately data-only. ProfilePage and SettingsPage consume the
// same tokens, so adding a theme never requires another rendering branch.
const THEME_SPECS: ThemeSpec[] = [
  // Existing themes, retained for backwards compatibility.
  starterTheme,
  { slug: "cutesy-pink", name: "Cutesy Pink", description: "Soft candy tones with an arcade-heart glow.", rarity: "epic", backgroundColor: "#fce7f3", primaryColor: "#4a0022", accentColor: "#ff2056", avatarBorderColor: "#ff2056", patternCss: "radial-gradient(circle at 20% 20%, #fff 0 2px, transparent 3px), radial-gradient(circle at 80% 70%, #ff78a022 0 18%, transparent 19%)", animation: "drift", previewGlyph: "♡", proOnly: true, light: true },
  { slug: "zombie", name: "Zombie", description: "Toxic green over a midnight survival bunker.", rarity: "epic", backgroundColor: "#0a0c0a", primaryColor: "#0d1a00", accentColor: "#9ae600", avatarBorderColor: "#9ae600", patternCss: "repeating-linear-gradient(105deg, transparent 0 12px, #9ae60012 13px 14px)", animation: "flicker", previewGlyph: "☣", proOnly: true },
  { slug: "cyberpunk", name: "Cyberpunk", description: "Neon city light, cyan edges, and magenta signal noise.", rarity: "epic", backgroundColor: "#020617", primaryColor: "#0a0e1a", accentColor: "#00d3f2", avatarBorderColor: "#00d3f2", patternCss: "linear-gradient(90deg, transparent 49%, #00d3f220 50%, transparent 51%), linear-gradient(0deg, transparent 49%, #e12afb18 50%, transparent 51%)", animation: "pulse", previewGlyph: "⌁", proOnly: true, fontFamily: "'Orbitron', sans-serif" },
  { slug: "neo", name: "NEO", description: "Terminal green for players who live in the code.", rarity: "epic", backgroundColor: "#000000", primaryColor: "#000800", accentColor: "#00ff41", avatarBorderColor: "#00ff41", patternCss: "repeating-linear-gradient(0deg, #00ff4109 0 1px, transparent 1px 4px)", animation: "scan", previewGlyph: ">_", proOnly: true, fontFamily: "'Share Tech Mono', monospace" },
  { slug: "blocks", name: "Blocks", description: "Chunky pixel geometry with a competitive red hit marker.", rarity: "epic", backgroundColor: "#1a1a1a", primaryColor: "#2d2d2d", accentColor: "#b7ff1a", avatarBorderColor: "#b7ff1a", patternCss: "linear-gradient(90deg, #ffffff08 1px, transparent 1px), linear-gradient(#ffffff08 1px, transparent 1px)", animation: "none", previewGlyph: "▦", proOnly: true, fontFamily: "'Press Start 2P', monospace" },
  { slug: "watermelon", name: "Watermelon", description: "A juicy summer palette with a lime rind edge.", rarity: "epic", backgroundColor: "#ff4d6d", primaryColor: "#1d3932", accentColor: "#b7ff1a", avatarBorderColor: "#ff6b6b", patternCss: "radial-gradient(ellipse at 20% 110%, #b7ff1a55 0 22%, transparent 23%), radial-gradient(ellipse at 85% -10%, #b7ff1a44 0 18%, transparent 19%)", animation: "drift", previewGlyph: "◉", proOnly: true, light: true },
  { slug: "forest", name: "Forest", description: "Moss, bark, and a quiet green hideout.", rarity: "epic", backgroundColor: "#0a2f1f", primaryColor: "#e8d5b7", accentColor: "#b7ff1a", avatarBorderColor: "#4a7c59", patternCss: "radial-gradient(ellipse at 0 100%, #8b5e3c33 0 25%, transparent 26%), radial-gradient(ellipse at 100% 0, #b7ff1a22 0 18%, transparent 19%)", animation: "drift", previewGlyph: "✦", proOnly: true },
  { slug: "ice", name: "Ice", description: "Frosted glass, blue light, and clean open space.", rarity: "rare", backgroundColor: "#f0f9ff", primaryColor: "#dbeafe", accentColor: "#0ea5e9", avatarBorderColor: "#0ea5e9", patternCss: "linear-gradient(120deg, #ffffff99 0 12%, transparent 13% 42%, #7dd3fc33 43% 44%, transparent 45%)", animation: "snow", previewGlyph: "❄", proOnly: true, light: true },
  { slug: "gothic", name: "Gothic", description: "Violet shadows with a dark fantasy silhouette.", rarity: "epic", backgroundColor: "#1e053a", primaryColor: "#59168b", accentColor: "#c27aff", avatarBorderColor: "#c27aff", patternCss: "radial-gradient(ellipse at 50% 0, #c27aff22, transparent 55%), repeating-linear-gradient(90deg, transparent 0 20px, #c27aff0d 21px 22px)", animation: "flicker", previewGlyph: "♰", proOnly: true },
  { slug: "summer", name: "Summer", description: "A bright seasonal shoreline for the 2026 showdown.", rarity: "legendary", backgroundColor: "#063b5c", primaryColor: "#087ea4", accentColor: "#12b8c4", avatarBorderColor: "#12b8c4", patternCss: "repeating-linear-gradient(0deg, #ffffff09 0 1px, transparent 1px 5px)", animation: "drift", previewGlyph: "☀", gradient: "repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 5px), linear-gradient(180deg, #28a9e8 0%, #087ea4 37%, #12b8c4 62%, #e9c47a 92%, #c99b50 100%)", unlockRewardName: "Summer Showdown 2026 Border" },
  { slug: "mac", name: "Mac", description: "A bright blue desktop-inspired profile for Mac the cat.", rarity: "epic", backgroundColor: "#f0f0f2", primaryColor: "#ffffff", accentColor: "#0066ff", avatarBorderColor: "#0066ff", patternCss: "radial-gradient(circle at 18% 18%, #0066ff16 0 18%, transparent 19%), linear-gradient(135deg, #ffffff, #dbeafe)", animation: "drift", previewGlyph: "⌘", proOnly: true, light: true },
  { slug: "cartoon", name: "Cartoon", description: "Warm paper, thick ink, and playful game-night energy.", rarity: "rare", backgroundColor: "#fffaec", primaryColor: "#ffffff", accentColor: "#ff5e5e", avatarBorderColor: "#ff5e5e", patternCss: "radial-gradient(circle, #ff5e5e22 0 5px, transparent 6px), radial-gradient(circle, #ffd16633 0 8px, transparent 9px)", animation: "drift", previewGlyph: "★", proOnly: true, light: true },
  { slug: "bubble-tea", name: "Bubble Tea", description: "Cream, tea, and soft boba highlights.", rarity: "rare", backgroundColor: "#fefce8", primaryColor: "#ffedd4", accentColor: "#d4a574", avatarBorderColor: "#d4a574", patternCss: "radial-gradient(circle at 20% 80%, #d4a57433 0 9px, transparent 10px), radial-gradient(circle at 70% 30%, #f9a8d433 0 6px, transparent 7px)", animation: "drift", previewGlyph: "●", proOnly: true, light: true },
  { slug: "mayhem", name: "Mayhem", description: "High-voltage color collisions for chaotic creators.", rarity: "epic", backgroundColor: "#0d0d0d", primaryColor: "#0d0d0d", accentColor: "#00dfff", avatarBorderColor: "#00dfff", patternCss: "repeating-linear-gradient(45deg, transparent 0 12px, #ffffff0a 12px 13px)", animation: "pulse", previewGlyph: "↯", proOnly: true, gradient: "repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.04) 12px, rgba(255,255,255,0.04) 13px), linear-gradient(135deg, #00dfff 0%, #9b30ff 50%, #ff0080 100%)" },
  { slug: "bat", name: "Bat", description: "Orange moonlight and nocturnal flight.", rarity: "rare", backgroundColor: "#111111", primaryColor: "#2a2a2a", accentColor: "#ff8c00", avatarBorderColor: "#ff8c00", patternCss: "radial-gradient(ellipse at 85% 12%, #ff8c0033 0 12%, transparent 13%), linear-gradient(160deg, transparent 65%, #ff8c0012 66% 67%, transparent 68%)", animation: "drift", previewGlyph: "◢", proOnly: true },
  // The 43-theme expansion.
  { slug: "cyber-city", name: "Cyber City", description: "Rain-slick towers, electric signs, and late-night multiplayer.", rarity: "rare", backgroundColor: "#071423", primaryColor: "#101d3a", accentColor: "#19e6ff", avatarBorderColor: "#19e6ff", patternCss: "linear-gradient(90deg, transparent 0 12%, #19e6ff22 13% 14%, transparent 15% 38%, #ff3dbb18 39% 40%, transparent 41%), repeating-linear-gradient(105deg, transparent 0 18px, #19e6ff0b 19px 20px)", animation: "rain", previewGlyph: "▥" },
  { slug: "void", name: "Void", description: "A nearly black singularity edged in ultraviolet.", rarity: "legendary", backgroundColor: "#030305", primaryColor: "#110c1f", accentColor: "#9b5cff", avatarBorderColor: "#9b5cff", patternCss: "radial-gradient(circle at 50% 50%, #9b5cff22, transparent 32%), radial-gradient(circle at 50% 50%, #000 0 13%, transparent 14%)", animation: "pulse", previewGlyph: "◌" },
  { slug: "glitch", name: "Glitch", description: "Broken pixels, offset channels, and unpredictable signal.", rarity: "rare", backgroundColor: "#101018", primaryColor: "#1f1f35", accentColor: "#ffea00", avatarBorderColor: "#ff3b81", patternCss: "linear-gradient(90deg, #ff3b8133 0 3%, transparent 3% 48%, #00f0ff33 48% 51%, transparent 51%), repeating-linear-gradient(0deg, transparent 0 7px, #ffea0012 8px 9px)", animation: "flicker", previewGlyph: "▧" },
  { slug: "retro-arcade", name: "Retro Arcade", description: "Coin-op color, marquee lights, and one more run.", rarity: "rare", backgroundColor: "#170b2e", primaryColor: "#32105c", accentColor: "#ffdd36", avatarBorderColor: "#ff5d8f", patternCss: "radial-gradient(circle, #ffdd3622 0 2px, transparent 3px), repeating-linear-gradient(90deg, transparent 0 15px, #ff5d8f12 16px 17px)", animation: "pulse", previewGlyph: "✦", fontFamily: "'Press Start 2P', monospace" },
  { slug: "pixel-world", name: "Pixel World", description: "A colorful 8-bit landscape built for your best scores.", rarity: "rare", backgroundColor: "#16233a", primaryColor: "#244d65", accentColor: "#7cff67", avatarBorderColor: "#7cff67", patternCss: "linear-gradient(90deg, #7cff6714 50%, transparent 50%), linear-gradient(#7cff6714 50%, transparent 50%)", animation: "none", previewGlyph: "▦", fontFamily: "'Press Start 2P', monospace" },
  { slug: "dungeon", name: "Dungeon", description: "Torchlight, stone walls, and loot around every corner.", rarity: "epic", backgroundColor: "#151219", primaryColor: "#2a2028", accentColor: "#e3a74f", avatarBorderColor: "#e3a74f", patternCss: "linear-gradient(135deg, #e3a74f18 25%, transparent 25% 50%, #e3a74f10 50% 75%, transparent 75%)", animation: "flicker", previewGlyph: "♜" },
  { slug: "dragonfire", name: "Dragonfire", description: "Ember red, molten gold, and a legendary roar.", rarity: "legendary", backgroundColor: "#20070b", primaryColor: "#40100d", accentColor: "#ff7a18", avatarBorderColor: "#ff3d24", patternCss: "radial-gradient(ellipse at 50% 100%, #ff7a1844, transparent 52%), repeating-linear-gradient(110deg, transparent 0 15px, #ff3d2414 16px 18px)", animation: "pulse", previewGlyph: "◈" },
  { slug: "frozen", name: "Frozen", description: "Blue-white crystal light from a world locked in ice.", rarity: "rare", backgroundColor: "#071b2c", primaryColor: "#0f3851", accentColor: "#9eeaff", avatarBorderColor: "#9eeaff", patternCss: "linear-gradient(135deg, transparent 0 44%, #9eeaff20 45% 47%, transparent 48% 70%, #ffffff15 71% 73%, transparent 74%)", animation: "snow", previewGlyph: "❄" },
  { slug: "toxic", name: "Toxic", description: "Warning stripes and radioactive lime for risk takers.", rarity: "epic", backgroundColor: "#111a0b", primaryColor: "#263810", accentColor: "#c7ff1a", avatarBorderColor: "#c7ff1a", patternCss: "repeating-linear-gradient(-45deg, #c7ff1a18 0 8px, transparent 8px 22px)", animation: "flicker", previewGlyph: "☢" },
  { slug: "hacker", name: "Hacker", description: "A green terminal wall for the player behind the screen.", rarity: "epic", backgroundColor: "#020b06", primaryColor: "#061b0d", accentColor: "#39ff88", avatarBorderColor: "#39ff88", patternCss: "repeating-linear-gradient(0deg, #39ff8810 0 1px, transparent 1px 4px), linear-gradient(90deg, transparent 95%, #39ff8820 96% 97%, transparent 98%)", animation: "scan", previewGlyph: "{}_", fontFamily: "'Share Tech Mono', monospace" },
  { slug: "neon-racer", name: "Neon Racer", description: "Fast lanes, hot magenta, and a finish-line glow.", rarity: "rare", backgroundColor: "#12091f", primaryColor: "#27104a", accentColor: "#ff38d1", avatarBorderColor: "#00e5ff", patternCss: "linear-gradient(165deg, transparent 0 46%, #ff38d133 47% 49%, transparent 50%), linear-gradient(15deg, transparent 0 58%, #00e5ff22 59% 61%, transparent 62%)", animation: "drift", previewGlyph: "➤" },
  { slug: "battle-royale", name: "Battle Royale", description: "A tactical drop zone with a storm-circle accent.", rarity: "epic", backgroundColor: "#111827", primaryColor: "#1f2937", accentColor: "#f59e0b", avatarBorderColor: "#f59e0b", patternCss: "radial-gradient(circle at 50% 50%, transparent 0 27%, #f59e0b33 28% 29%, transparent 30%), linear-gradient(135deg, #f59e0b0d 25%, transparent 25%)", animation: "pulse", previewGlyph: "⌖" },
  { slug: "space-marine", name: "Space Marine", description: "Armour plating and blue tactical HUD light.", rarity: "epic", backgroundColor: "#0d1723", primaryColor: "#1b3042", accentColor: "#68c7ff", avatarBorderColor: "#68c7ff", patternCss: "linear-gradient(90deg, #68c7ff10 1px, transparent 1px), linear-gradient(#68c7ff10 1px, transparent 1px)", animation: "scan", previewGlyph: "◉" },
  { slug: "alien-planet", name: "Alien Planet", description: "Bioluminescent purple flora on an unfamiliar world.", rarity: "rare", backgroundColor: "#140b24", primaryColor: "#281548", accentColor: "#c58cff", avatarBorderColor: "#61f4d5", patternCss: "radial-gradient(ellipse at 20% 90%, #61f4d533 0 12%, transparent 13%), radial-gradient(ellipse at 80% 15%, #c58cff2e 0 16%, transparent 17%)", animation: "drift", previewGlyph: "✧" },
  { slug: "mech", name: "Mech", description: "Industrial steel, warning lights, and heavy machinery.", rarity: "epic", backgroundColor: "#171b20", primaryColor: "#2c333b", accentColor: "#ffb52e", avatarBorderColor: "#ffb52e", patternCss: "repeating-linear-gradient(90deg, transparent 0 15px, #ffffff0a 16px 18px), repeating-linear-gradient(0deg, transparent 0 15px, #ffb52e0d 16px 18px)", animation: "none", previewGlyph: "⚙" },
  { slug: "boss-fight", name: "Boss Fight", description: "The arena is lit. Bring your best build.", rarity: "legendary", backgroundColor: "#1b0710", primaryColor: "#3b0f1d", accentColor: "#ff315c", avatarBorderColor: "#ffd166", patternCss: "radial-gradient(ellipse at 50% 0, #ff315c33, transparent 56%), linear-gradient(90deg, transparent 45%, #ffd16616 46% 54%, transparent 55%)", animation: "pulse", previewGlyph: "☠" },
  { slug: "stealth", name: "Stealth", description: "Low light, quiet edges, and a precise target reticle.", rarity: "rare", backgroundColor: "#0b0f12", primaryColor: "#151b20", accentColor: "#a7c7b7", avatarBorderColor: "#a7c7b7", patternCss: "linear-gradient(135deg, transparent 48%, #a7c7b712 49% 51%, transparent 52%)", animation: "none", previewGlyph: "⌁" },
  { slug: "pirate", name: "Pirate", description: "Salt air, treasure maps, and a gold doubloon shine.", rarity: "rare", backgroundColor: "#101d2a", primaryColor: "#20354a", accentColor: "#f5c451", avatarBorderColor: "#f5c451", patternCss: "repeating-linear-gradient(25deg, transparent 0 18px, #f5c45112 19px 21px), radial-gradient(circle at 80% 20%, #f5c45120 0 12%, transparent 13%)", animation: "drift", previewGlyph: "⚓" },
  { slug: "apocalypse", name: "Apocalypse", description: "Dusty skies, rusted metal, and a last-player-standing mood.", rarity: "epic", backgroundColor: "#1d1512", primaryColor: "#38241b", accentColor: "#e06b3c", avatarBorderColor: "#e06b3c", patternCss: "linear-gradient(155deg, transparent 0 40%, #e06b3c18 41% 42%, transparent 43%), radial-gradient(ellipse at 50% 100%, #e06b3c1a, transparent 55%)", animation: "flicker", previewGlyph: "☢" },
  { slug: "western", name: "Western", description: "Sunset dust and a frontier badge for lone wolves.", rarity: "rare", backgroundColor: "#2a1710", primaryColor: "#4b2918", accentColor: "#f4b860", avatarBorderColor: "#f4b860", patternCss: "linear-gradient(180deg, #f4b86033, transparent 40%), repeating-linear-gradient(90deg, transparent 0 22px, #f4b8600c 23px 24px)", animation: "drift", previewGlyph: "★" },
  { slug: "samurai", name: "Samurai", description: "Ink-black calm crossed by a single crimson slash.", rarity: "epic", backgroundColor: "#100b10", primaryColor: "#21131b", accentColor: "#e7354b", avatarBorderColor: "#e7354b", patternCss: "linear-gradient(155deg, transparent 0 47%, #e7354b44 48% 50%, transparent 51%), radial-gradient(circle at 10% 10%, #ffffff12, transparent 20%)", animation: "none", previewGlyph: "刀" },
  { slug: "viking", name: "Viking", description: "Cold iron, northern water, and a storm-ready shield.", rarity: "epic", backgroundColor: "#0e1b22", primaryColor: "#183744", accentColor: "#83d0c4", avatarBorderColor: "#d5a74a", patternCss: "linear-gradient(60deg, transparent 42%, #83d0c422 43% 45%, transparent 46%), radial-gradient(circle at 80% 20%, #d5a74a22, transparent 24%)", animation: "drift", previewGlyph: "ᛟ" },
  { slug: "mythic", name: "Mythic", description: "A gilded fantasy aura for stories worth retelling.", rarity: "legendary", backgroundColor: "#170f2b", primaryColor: "#302052", accentColor: "#f4d35e", avatarBorderColor: "#d59cff", patternCss: "radial-gradient(circle at 50% 50%, #f4d35e22 0 3%, transparent 4% 22%, #d59cff18 23% 24%, transparent 25%)", animation: "pulse", previewGlyph: "✦" },
  { slug: "underworld", name: "Underworld", description: "Deep crimson, smoke, and a portal below.", rarity: "legendary", backgroundColor: "#160609", primaryColor: "#320b13", accentColor: "#ff496b", avatarBorderColor: "#a855f7", patternCss: "radial-gradient(ellipse at 50% 100%, #ff496b33, transparent 50%), radial-gradient(circle at 50% 100%, transparent 0 18%, #a855f722 19% 20%, transparent 21%)", animation: "pulse", previewGlyph: "◉" },
  { slug: "celestial", name: "Celestial", description: "Starlight, soft gold, and a serene cosmic horizon.", rarity: "legendary", backgroundColor: "#0b1230", primaryColor: "#17275a", accentColor: "#ffe79a", avatarBorderColor: "#9edbff", patternCss: "radial-gradient(circle at 15% 20%, #fff 0 1px, transparent 2px), radial-gradient(circle at 78% 62%, #ffe79a 0 1px, transparent 2px), radial-gradient(ellipse at 50% 0, #9edbff22, transparent 58%)", animation: "drift", previewGlyph: "✧" },
  { slug: "synthwave", name: "Synthwave", description: "A sunset grid from an alternate arcade timeline.", rarity: "rare", backgroundColor: "#180d2b", primaryColor: "#32164e", accentColor: "#ff64d8", avatarBorderColor: "#45e5ff", patternCss: "linear-gradient(#45e5ff22 1px, transparent 1px), linear-gradient(90deg, #45e5ff22 1px, transparent 1px), linear-gradient(180deg, #ff64d822, transparent 55%)", animation: "scan", previewGlyph: "⌁" },
  { slug: "crt", name: "CRT", description: "Scanlines, phosphor glow, and a warm old-school signal.", rarity: "rare", backgroundColor: "#07100c", primaryColor: "#0c2115", accentColor: "#b4ff81", avatarBorderColor: "#b4ff81", patternCss: "repeating-linear-gradient(0deg, #b4ff8112 0 1px, transparent 1px 4px), radial-gradient(ellipse at 50% 50%, #b4ff8117, transparent 70%)", animation: "scan", previewGlyph: "▤", fontFamily: "'Share Tech Mono', monospace" },
  { slug: "comic-gamer", name: "Comic Gamer", description: "Halftone dots, speech-bubble energy, and bold outlines.", rarity: "rare", backgroundColor: "#fff7d6", primaryColor: "#ffe29a", accentColor: "#e83c54", avatarBorderColor: "#3d5afe", patternCss: "radial-gradient(circle, #20202026 0 2px, transparent 3px), linear-gradient(135deg, #3d5afe18, transparent 45%)", animation: "drift", previewGlyph: "POW!", light: true },
  { slug: "graffiti", name: "Graffiti", description: "Spray-paint color bursts on a concrete night.", rarity: "rare", backgroundColor: "#17151c", primaryColor: "#29242f", accentColor: "#ff4f9a", avatarBorderColor: "#a8ff3e", patternCss: "radial-gradient(ellipse at 15% 25%, #a8ff3e2c 0 13%, transparent 14%), radial-gradient(ellipse at 80% 72%, #ff4f9a2c 0 17%, transparent 18%), linear-gradient(120deg, transparent 45%, #53d7ff22 46% 52%, transparent 53%)", animation: "drift", previewGlyph: "✚" },
  { slug: "streamer-rgb", name: "Streamer RGB", description: "A studio-ready RGB wash for live creators.", rarity: "epic", backgroundColor: "#0d1019", primaryColor: "#171d2f", accentColor: "#45e5ff", avatarBorderColor: "#ff4fd8", patternCss: "linear-gradient(120deg, #45e5ff1c, transparent 35%, #ff4fd81c 66%, transparent 82%)", animation: "pulse", previewGlyph: "LIVE" },
  { slug: "achievement-hunter", name: "Achievement Hunter", description: "Gold medals and a progress bar for completionists.", rarity: "epic", backgroundColor: "#19140b", primaryColor: "#30240e", accentColor: "#ffd447", avatarBorderColor: "#ffd447", patternCss: "linear-gradient(90deg, #ffd44733 0 62%, transparent 63%), radial-gradient(circle at 86% 22%, #ffd44733 0 10%, transparent 11%)", animation: "pulse", previewGlyph: "★" },
  { slug: "loot-room", name: "Loot Room", description: "A vault of emerald, gold, and hidden rewards.", rarity: "epic", backgroundColor: "#0b1715", primaryColor: "#123027", accentColor: "#70e09a", avatarBorderColor: "#f5c451", patternCss: "radial-gradient(circle at 20% 30%, #f5c45122 0 8%, transparent 9%), radial-gradient(circle at 80% 70%, #70e09a22 0 11%, transparent 12%)", animation: "drift", previewGlyph: "◆" },
  { slug: "legendary-drop", name: "Legendary Drop", description: "A rare-drop shimmer reserved for standout profiles.", rarity: "legendary", backgroundColor: "#1c1128", primaryColor: "#3b1e4d", accentColor: "#ffcb69", avatarBorderColor: "#ff70d1", patternCss: "radial-gradient(circle at 20% 20%, #ffcb69 0 1px, transparent 2px), radial-gradient(circle at 76% 44%, #ff70d1 0 1px, transparent 2px), linear-gradient(135deg, #ffcb6922, transparent 55%)", animation: "spark", previewGlyph: "✧" },
  { slug: "emerald", name: "Emerald", description: "Deep green jewel tones with a clean ranked edge.", rarity: "rare", backgroundColor: "#071b15", primaryColor: "#0d3a2b", accentColor: "#43e6a0", avatarBorderColor: "#43e6a0", patternCss: "linear-gradient(135deg, transparent 38%, #43e6a022 39% 61%, transparent 62%), radial-gradient(circle at 80% 20%, #43e6a022, transparent 24%)", animation: "pulse", previewGlyph: "◇" },
  { slug: "obsidian", name: "Obsidian", description: "Polished black glass with a razor-thin violet edge.", rarity: "legendary", backgroundColor: "#08080c", primaryColor: "#14141d", accentColor: "#d5b4ff", avatarBorderColor: "#d5b4ff", patternCss: "linear-gradient(125deg, #ffffff10 0 1px, transparent 2px 38%, #d5b4ff14 39% 40%, transparent 41%)", animation: "drift", previewGlyph: "◇" },
  { slug: "plasma", name: "Plasma", description: "Liquid neon energy in perpetual motion.", rarity: "legendary", backgroundColor: "#12051c", primaryColor: "#270b3c", accentColor: "#d946ef", avatarBorderColor: "#4adee8", patternCss: "radial-gradient(ellipse at 20% 30%, #4adee844, transparent 36%), radial-gradient(ellipse at 82% 72%, #d946ef44, transparent 38%)", animation: "drift", previewGlyph: "◒" },
  { slug: "lightning", name: "Lightning", description: "Electric blue with a strike-ready charge.", rarity: "epic", backgroundColor: "#071324", primaryColor: "#10284a", accentColor: "#f5f7ff", avatarBorderColor: "#5ce1ff", patternCss: "linear-gradient(120deg, transparent 0 42%, #5ce1ff55 43% 45%, transparent 46% 57%, #f5f7ff33 58% 60%, transparent 61%)", animation: "flicker", previewGlyph: "ϟ" },
  { slug: "inferno", name: "Inferno", description: "A hot orange core for profiles that never cool down.", rarity: "epic", backgroundColor: "#210a05", primaryColor: "#451107", accentColor: "#ff8b2d", avatarBorderColor: "#ffdc5e", patternCss: "radial-gradient(ellipse at 50% 100%, #ff8b2d55, transparent 56%), repeating-linear-gradient(70deg, transparent 0 19px, #ffdc5e12 20px 22px)", animation: "pulse", previewGlyph: "▲" },
  { slug: "ocean-depths", name: "Ocean Depths", description: "Submerged blue layers with a calm bioluminescent edge.", rarity: "rare", backgroundColor: "#041928", primaryColor: "#073b5c", accentColor: "#4de4ff", avatarBorderColor: "#4de4ff", patternCss: "radial-gradient(ellipse at 20% 90%, #4de4ff22, transparent 30%), radial-gradient(ellipse at 80% 20%, #1687aa22, transparent 33%), repeating-linear-gradient(0deg, transparent 0 18px, #4de4ff0b 19px 20px)", animation: "drift", previewGlyph: "≈" },
  { slug: "abyss", name: "Abyss", description: "A deep blue-black profile for the quiet competitor.", rarity: "epic", backgroundColor: "#020a15", primaryColor: "#07172b", accentColor: "#287bff", avatarBorderColor: "#287bff", patternCss: "radial-gradient(ellipse at 50% 100%, #287bff22, transparent 58%), linear-gradient(90deg, transparent 48%, #287bff10 49% 51%, transparent 52%)", animation: "pulse", previewGlyph: "∿" },
  { slug: "cosmic-gamer", name: "Cosmic Gamer", description: "Nebula color, distant stars, and infinite replayability.", rarity: "legendary", backgroundColor: "#0b0820", primaryColor: "#1e1450", accentColor: "#e879f9", avatarBorderColor: "#8be9fd", patternCss: "radial-gradient(circle at 12% 18%, #fff 0 1px, transparent 2px), radial-gradient(circle at 76% 30%, #8be9fd 0 1px, transparent 2px), radial-gradient(ellipse at 50% 60%, #e879f922, transparent 55%)", animation: "drift", previewGlyph: "✦" },
  { slug: "game-over", name: "Game Over", description: "Red terminal lights for a profile that keeps coming back.", rarity: "rare", backgroundColor: "#120709", primaryColor: "#280d12", accentColor: "#ff435c", avatarBorderColor: "#ff435c", patternCss: "repeating-linear-gradient(0deg, #ff435c10 0 1px, transparent 1px 5px), linear-gradient(90deg, transparent 0 92%, #ff435c22 93% 94%, transparent 95%)", animation: "flicker", previewGlyph: "GO", fontFamily: "'Share Tech Mono', monospace" },
];

export const PROFILE_THEMES: ProfileThemeDefinition[] = THEME_SPECS.map((spec) => makeTheme(spec));
export const PROFILE_THEME_BY_SLUG = new Map(PROFILE_THEMES.map((theme) => [theme.slug, theme]));

const LEGACY_DEFAULT_BACKGROUNDS = new Set(["#0b2232", "#121f2b", "#071013"]);
const LEGACY_DEFAULT_ACCENTS = new Set(["#b7ff1a", "#4ade80"]);
const LEGACY_DEFAULT_PRIMARY_COLORS = new Set(["#02172c", "#071013", "#0b1218"]);
const LEGACY_DEFAULT_CARD_COLORS = new Set(["#1e3a8a"]);
const LEGACY_DEFAULT_AVATAR_BORDERS = new Set(["#4ade80", "#b7ff1a"]);

export type ProfileThemeValues = {
  profileBackgroundTheme?: string | null;
  backgroundColor?: string | null;
  primaryColor?: string | null;
  cardColor?: string | null;
  accentColor?: string | null;
  avatarBorderColor?: string | null;
  profileBackgroundImageUrl?: string | null;
  profileBackgroundGradientCss?: string | null;
};

const normalise = (value?: string | null) => value?.trim().toLowerCase() || "";

export function getProfileTheme(slug?: string | null): ProfileThemeDefinition | undefined {
  return PROFILE_THEME_BY_SLUG.get(slug || "");
}

function inferTheme(profile: ProfileThemeValues): ProfileThemeDefinition | undefined {
  const background = normalise(profile.backgroundColor);
  const accent = normalise(profile.accentColor);
  return PROFILE_THEMES.find((theme) =>
    theme.slug !== "default" &&
    theme.backgroundColor.toLowerCase() === background &&
    theme.accentColor.toLowerCase() === accent
  );
}

export function isLegacyDefaultProfileTheme(profile: ProfileThemeValues): boolean {
  if (profile.profileBackgroundImageUrl?.trim() || profile.profileBackgroundGradientCss?.trim()) return false;
  const background = normalise(profile.backgroundColor);
  const accent = normalise(profile.accentColor);
  const primary = normalise(profile.primaryColor);
  return (!background || LEGACY_DEFAULT_BACKGROUNDS.has(background)) &&
    (!accent || LEGACY_DEFAULT_ACCENTS.has(accent)) &&
    (!primary || LEGACY_DEFAULT_PRIMARY_COLORS.has(primary));
}

export function resolveProfileTheme(profile: ProfileThemeValues) {
  const selected = getProfileTheme(profile.profileBackgroundTheme) || inferTheme(profile);
  if (selected && selected.slug !== "default") {
    return { ...selected, theme: selected };
  }

  const hasCustomBackground = !!profile.profileBackgroundImageUrl?.trim() || !!profile.profileBackgroundGradientCss?.trim();
  const isCurrentDefault = !hasCustomBackground &&
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
      theme: undefined,
    };
  }

  return {
    ...DEFAULT_PROFILE_THEME,
    theme: starterTheme,
    cardColor: !profile.cardColor || LEGACY_DEFAULT_CARD_COLORS.has(normalise(profile.cardColor))
      ? DEFAULT_PROFILE_THEME.cardColor
      : profile.cardColor,
    avatarBorderColor: !profile.avatarBorderColor || LEGACY_DEFAULT_AVATAR_BORDERS.has(normalise(profile.avatarBorderColor))
      ? DEFAULT_PROFILE_THEME.avatarBorderColor
      : profile.avatarBorderColor,
  };
}