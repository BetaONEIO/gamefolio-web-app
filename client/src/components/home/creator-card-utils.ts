export interface TrendingEntry {
  userId: number;
  rank: number;
  uploadsCount: number;
  totalPoints: number;
  clipsCount: number;
  reelsCount: number;
  screenshotsCount: number;
  followersCount: number;
  followingCount?: number;
  user: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    avatarBorderColor: string | null;
    accentColor: string | null;
    level?: number | null;
    backgroundColor?: string | null;
    primaryColor?: string | null;
    profileBackgroundType?: string | null;
    profileBackgroundTheme?: string | null;
    profileBackgroundGradient?: boolean | null;
    profileBackgroundGradientCss?: string | null;
    profileBackgroundImageUrl?: string | null;
  };
}

export function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function isLightHex(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length !== 6) return false;
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 0.5;
}

export function getCardTheme(user: TrendingEntry['user']): { style: React.CSSProperties; isLight: boolean; hasCustomBg: boolean } {
  const bg = (user.backgroundColor || '#0B1319').toLowerCase();
  const accent = (user.accentColor || '#B7FF1A').toLowerCase();
  const primary = user.primaryColor || '#071013';
  const isLight = isLightHex(bg);

  const isMayhem     = !isLight && accent === '#00dfff';
  const isNeo        = !isLight && accent === '#00ff41';
  const isCyberpunk  = !isLight && accent === '#00d3f2';
  const isZombie     = !isLight && accent === '#9ae600';
  const isGothic     = !isLight && accent === '#c27aff' && bg === '#1e053a';
  const isBlocks     = !isLight && accent === '#b7ff1a' && bg === '#1a1a1a';
  const isForest     = !isLight && accent === '#b7ff1a' && bg === '#0a2f1f';
  const isElectric   = !isLight && accent === '#ffe033' && bg === '#1a1200';
  const isBat        = !isLight && accent === '#ff8c00' && (bg === '#111111' || bg === '#0a0010');
  const isWatermelon = accent === '#b7ff1a' && bg === '#ff4d6d';

  const isDefault = bg === '#0b1319' || bg === '#121f2b' || bg === '#000000';

  if (user.profileBackgroundImageUrl) {
    return {
      style: {
        backgroundImage: `url(${user.profileBackgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: '50% 30%',
      },
      isLight: false,
      hasCustomBg: true,
    };
  }

  if (isMayhem)    return { style: { background: 'linear-gradient(to bottom right, #00DFFF 0%, #9B30E8 48%, #FF0069 100%)' }, isLight: false, hasCustomBg: true };
  if (isBat)       return { style: { background: 'linear-gradient(180deg, #2a2a2a 0%, #111111 100%)' }, isLight: false, hasCustomBg: true };
  if (isGothic)    return { style: { background: 'linear-gradient(180deg, #3d0070 0%, #1e053a 100%)' }, isLight: false, hasCustomBg: true };
  if (isBlocks)    return { style: { background: '#87ceeb' }, isLight: true, hasCustomBg: true };
  if (isNeo)       return { style: { background: '#000800' }, isLight: false, hasCustomBg: true };
  if (isForest)    return { style: { background: '#0a2f1f' }, isLight: false, hasCustomBg: true };
  if (isElectric)  return { style: { background: 'linear-gradient(180deg, #3a2e00 0%, #1a1200 100%)' }, isLight: false, hasCustomBg: true };
  if (isZombie)    return { style: { background: 'linear-gradient(180deg, #1a2e00 0%, #0d1800 100%)' }, isLight: false, hasCustomBg: true };
  if (isCyberpunk) return { style: { background: 'linear-gradient(180deg, #001520 0%, #000c15 100%)' }, isLight: false, hasCustomBg: true };
  if (isWatermelon) return { style: { background: 'linear-gradient(135deg, #ff4d6d 0%, #c9184a 100%)' }, isLight: false, hasCustomBg: true };

  if (user.profileBackgroundGradientCss) {
    return { style: { background: user.profileBackgroundGradientCss }, isLight: false, hasCustomBg: true };
  }

  if (isDefault) return { style: { background: 'rgba(11,19,25,0.95)' }, isLight: false, hasCustomBg: false };

  if (user.profileBackgroundGradient !== false && !isLight) {
    return {
      style: { background: `linear-gradient(180deg, ${primary} 0%, ${bg} 55%, ${bg} 100%)` },
      isLight: false,
      hasCustomBg: true,
    };
  }

  return { style: { backgroundColor: bg }, isLight, hasCustomBg: true };
}

export const CREATOR_CARD_STYLES = `
  .fire-card {
    position: relative;
    border: 2px solid rgba(183,255,26,0.55);
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  }
`;
