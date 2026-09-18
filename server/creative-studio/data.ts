import { resolveProfileTheme } from '../../shared/profile-theme';
import { storage } from '../storage';
import { supabaseStorage } from '../supabase-storage';
import { SEASON_DEFS, getPublicSeasonNumber } from '../../shared/season-definitions';
import { exportFilename, type ExportRequest, type StudioComposition, type StudioProfile } from '../../shared/creative-studio';
import { TOWERDOG_PROFILE_BORDER_URL, getRasterBorderCalibration } from '../../shared/avatar-frame';
import { rasterAsset } from './assets';

export async function loadComposition(request: ExportRequest): Promise<StudioComposition> {
  const warnings: string[] = [];
  const assetCache = new Map<string, Promise<string | undefined>>();
  const asset = async (url: string | null | undefined, label: string, frameColor?: string) => {
    if (!url) return undefined;
    const key = `${url}|${frameColor || ""}`;
    if (!assetCache.has(key)) assetCache.set(key, (async () => {
      try {
        const signed = url.includes('supabase.co/storage') ? await supabaseStorage.convertToSignedUrl(url, 3600) : url;
        return await rasterAsset(signed || url, frameColor);
      } catch { warnings.push(`${label} could not be loaded; a static fallback is shown.`); return undefined; }
    })());
    return assetCache.get(key)!;
  };
  const profile = async (id: number, withStats = true): Promise<StudioProfile> => {
    const detailed = withStats ? await storage.getUserWithStats(id) : undefined;
    const u = withStats ? detailed : await storage.getUser(id);
    if (!u) throw new Error('The selected profile no longer exists.');
    if (withStats && !detailed?._count) throw new Error('The selected profile statistics are unavailable.');
    const [border, frame, nameTag, badge] = await Promise.all([
      u.selectedBorderId ? storage.getProfileBorder(u.selectedBorderId) : null,
      u.selectedAvatarBorderId && u.selectedAvatarBorderId > 0 ? storage.getAssetReward(u.selectedAvatarBorderId) : null,
      withStats && u.selectedNameTagId ? storage.getNameTag(u.selectedNameTagId) : null,
      u.selectedVerificationBadgeId ? storage.getVerificationBadge(u.selectedVerificationBadgeId) : null,
    ]);
    const [avatar, banner, avatarBorder, profileBorder, tag, verificationBadge, background] = await Promise.all([
      asset(u.nftProfileTokenId && u.nftProfileImageUrl && (u.activeProfilePicType === 'nft' || !u.activeProfilePicType) ? u.nftProfileImageUrl : u.avatarUrl, 'Avatar'),
      asset(!withStats || u.hideBanner ? null : u.bannerUrl, 'Banner'),
      asset(frame?.sourcePath === 'red_blue_pixel_waves' ? TOWERDOG_PROFILE_BORDER_URL : frame?.imageUrl, 'Avatar border', resolveProfileTheme(u).avatarBorderColor),
      asset(border?.imageUrl, 'Profile border'), asset(nameTag?.imageUrl, 'Name tag'), asset(badge?.name?.toLowerCase() === 'verified128' && !u.isPro ? null : badge?.imageUrl, 'Verification badge'),
      asset(withStats ? u.profileBackgroundImageUrl : null, 'Theme background'),
    ]);
    return { id: u.id, username: u.username, displayName: u.displayName || u.username, level: u.level ?? 1, xp: u.totalXP,
      frameCalibration: frame ? getRasterBorderCalibration(frame) : undefined,
      avatar, banner, avatarBorder, profileBorder, nameTag: tag, verificationBadge,
      profileBackgroundTheme: u.profileBackgroundTheme, backgroundColor: u.backgroundColor, primaryColor: u.primaryColor,
      cardColor: u.cardColor, accentColor: u.accentColor, avatarBorderColor: u.avatarBorderColor,
      profileBackgroundImageUrl: background, profileBackgroundGradientCss: u.profileBackgroundGradientCss,
      profileFont: u.profileFont, profileFontEffect: u.profileFontEffect, profileFontColor: u.profileFontColor,
      stats: withStats ? { followers: Number(detailed!._count!.followers), posts: Number(detailed!._count!.clips) + Number(detailed!._count!.screenshots), views: Number(detailed!._count!.views) } : undefined,
    };
  };
  const result: StudioComposition = { request, title: '', subtitle: '', filename: '', warnings };
  if (request.background) {
    const files = await supabaseStorage.listBucketFiles('gamefolio-media', 'creative-studio');
    const file = files.find(f => f.path === request.background);
    result.background = await asset(file?.publicUrl, 'Custom background');
    if (!file) warnings.push('Custom background is missing; Gamefolio Default is shown.');
  }
  if (request.type === 'profile') {
    result.profile = await profile(request.id);
    result.title = result.profile.displayName;
    result.subtitle = 'PLAYER SPOTLIGHT';
    result.filename = exportFilename('profile', result.profile.username);
  } else if (request.type === 'game') {
    const game = await storage.getGame(request.id);
    if (!game) throw new Error('The selected game no longer exists.');
    result.game = { id: game.id, name: game.name, image: await asset(game.imageUrl, 'Game artwork') };
    result.title = game.name; result.subtitle = 'IN THE GAMEFOLIO COLLECTION';
    result.filename = exportFilename('card', game.name);
  } else {
    const season = SEASON_DEFS.find(s => s.num === request.id);
    if (!season) throw new Error('Select an available season.');
    const [sy, sm] = season.months[0].split('-').map(Number);
    const [ey, em] = season.months[season.months.length - 1].split('-').map(Number);
    const entries = await storage.getSeasonLeaderboardForRewards(new Date(Date.UTC(sy, sm - 1, 1)), new Date(Date.UTC(ey, em, 1)), request.top, season.num === SEASON_DEFS[0].num);
    result.entries = await Promise.all(entries.map(async e => ({ rank: e.rank, xp: e.seasonPoints, profile: await profile(e.userId, false) })));
    result.title = season.name;
    result.subtitle = `SEASON ${getPublicSeasonNumber(season.num)} · ${season.dateRange} · ${season.num === SEASON_DEFS[0].num ? 'LIVE LEADERBOARD' : 'FINAL LEADERBOARD'}`;
    result.filename = exportFilename('leaderboard', `${season.name}-${season.months[0]}`);
    if (!result.entries.length) throw new Error('This season has no ranked participants yet.');
  }
  return result;
}
