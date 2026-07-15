import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { UserWithStats, ClipWithUser, Screenshot, GameBounty, IndieGameProfile } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import PlatformConnections from '@/components/profile/PlatformConnections';
import { ReportOwnershipButton } from '@/components/reporting/ReportOwnershipButton';
import { SiSteam, SiEpicgames, SiItchdotio } from 'react-icons/si';
import {
  Users,
  Eye,
  Flame,
  MessageCircle,
  UserPlus,
  UserCheck,
  Video,
  Play,
  Camera,
  Star,
  Award,
  CheckCircle2,
  Terminal,
  Sword,
  Key,
  Clock,
  Globe,
  Twitter,
  Monitor,
  Gamepad2,
  Smartphone,
  ExternalLink,
  Tag,
  SlidersHorizontal,
} from 'lucide-react';

const MessageDialog = React.lazy(() =>
  import('@/components/messages/MessageDialog').then((m) => ({ default: m.MessageDialog }))
);

const TABS = ['OVERVIEW', 'CLIPS', 'REELS', 'SCREENSHOTS', 'BOUNTIES'];

function getVideoEmbedUrl(url: string): string | null {
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  return null;
}

type BountyWithMeta = GameBounty & { participantCount?: number; gameName?: string; gameImageUrl?: string };

interface IndieGameProfileLayoutProps {
  profile: UserWithStats;
  isOwnProfile: boolean;
}

export default function IndieGameProfileLayout({ profile, isOwnProfile }: IndieGameProfileLayoutProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  const brand = {
    bg: '#0B1319',
    accent: '#B7FF18',
    cardBg: 'rgba(255, 255, 255, 0.04)',
    cardBorder: 'rgba(183, 255, 24, 0.15)',
    textMuted: 'rgba(255, 255, 255, 0.7)',
  };

  const cardStyle: React.CSSProperties = {
    background: brand.cardBg,
    border: `1px solid ${brand.cardBorder}`,
    borderRadius: '12px',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
  };

  const glowStyle: React.CSSProperties = {
    boxShadow: `0 0 20px rgba(183, 255, 24, 0.2)`,
  };

  const { data: followStatus } = useQuery<{ status: 'following' | 'requested' | 'not_following' }>({
    queryKey: [`/api/users/${profile.username}/follow-status`],
    enabled: !!currentUser && !isOwnProfile,
  });

  const { data: clips } = useQuery<ClipWithUser[]>({
    queryKey: [`/api/users/${profile.username}/clips`],
  });

  const { data: screenshots } = useQuery<Screenshot[]>({
    queryKey: [`/api/users/${profile.id}/screenshots`],
  });

  const { data: bounties } = useQuery<BountyWithMeta[]>({
    queryKey: [`/api/users/${profile.username}/bounties`],
  });

  const { data: indieGameData } = useQuery<{ profile: IndieGameProfile } | null>({
    queryKey: [`/api/games/indie/${profile.username}`],
    retry: false,
  });
  const ig = (indieGameData?.profile ?? null) as IndieGameProfile | null;

  // Resolve the Steam App ID from any available source
  const steamAppId: string | null =
    ig?.steamAppId ||
    (profile as any).steamVerifiedAppId ||
    (() => {
      const url: string | null = ig?.steamUrl || (profile as any).gameSteamUrl || null;
      if (!url) return null;
      const m = url.match(/store\.steampowered\.com\/app\/(\d+)/);
      return m ? m[1] : null;
    })();

  // Live Steam data — fetched automatically when a Steam App ID is linked.
  // Profile DB data always takes precedence; Steam fills in any empty fields.
  const { data: steamLive } = useQuery<{
    appId: string;
    steamUrl: string;
    name: string | null;
    headerImageUrl: string | null;
    capsuleImageUrl: string | null;
    developerName: string | null;
    publisherName: string | null;
    website: string | null;
    fields: Record<string, any>;
  } | null>({
    queryKey: ['/api/steam/app-info', steamAppId],
    enabled: !!steamAppId,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  const st = steamLive?.fields ?? null;

  // Enriched fields: prefer indie_game_profiles table data, fall back to live Steam, then legacy user columns
  const igTrailerUrl = ig?.trailerUrl || st?.trailerUrl || (profile as any).gameTrailerUrl || null;
  const igDescription = ig?.fullDescription || ig?.shortDescription || st?.fullDescription || st?.shortDescription || (profile as any).gameDescription || null;
  const igScreenshots: string[] = (ig?.screenshotUrls?.length ? ig.screenshotUrls : (st?.screenshotUrls?.length ? st.screenshotUrls : (profile as any).gameScreenshotUrls)) ?? [];
  const igKeyFeatures: string[] = (ig?.keyFeatures?.length ? ig.keyFeatures : (profile as any).gameKeyFeatures) ?? [];
  const igSteamUrl = ig?.steamUrl || steamLive?.steamUrl || (profile as any).gameSteamUrl || null;
  const igEpicUrl = ig?.epicUrl || (profile as any).gameEpicUrl || null;
  const igItchUrl = ig?.itchUrl || null;
  const igReleaseDate = ig?.releaseDate || st?.releaseDate || (profile as any).gameReleaseDate || null;
  const igStudioName = ig?.studioName || steamLive?.developerName || null;
  const igStudioFounded = ig?.studioFoundedYear || (profile as any).studioFoundedYear || null;
  const igStudioSize = ig?.studioTeamSize || (profile as any).studioTeamSize || null;
  const igStudioWebsite = ig?.studioWebsite || steamLive?.website || null;
  const igStudioCountry = ig?.studioCountry || null;
  const igWebsiteUrl = ig?.websiteUrl || steamLive?.website || null;
  const igTwitterUrl = ig?.twitterUrl || null;
  const igDiscordUrl = ig?.discordUrl || null;
  const igGenres: string[] = ig?.genres?.length ? ig.genres : (st?.genres ?? []);
  const igPlatforms: string[] = ig?.platforms?.length ? ig.platforms : (st?.platforms ?? []);
  const igPrice = ig?.price || st?.price || null;
  const igReleaseStatus = ig?.releaseStatus || st?.releaseStatus || null;
  const igHeaderImageUrl = ig?.headerImageUrl || steamLive?.headerImageUrl || null;

  const isFollowing = followStatus?.status === 'following';
  const isRequested = followStatus?.status === 'requested';

  const followMutation = useMutation({
    mutationFn: async () => {
      const method = isFollowing || isRequested ? 'DELETE' : 'POST';
      const response = await fetch(`/api/users/${profile.username}/follow`, {
        method,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to update follow status');
      return response.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profile.username}/follow-status`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profile.username}`] });
    },
    onError: (err: Error) => {
      toast({ description: err.message || 'Something went wrong.', variant: 'gamefolioError' });
    },
  });

  const handleFollowClick = () => {
    if (!currentUser) {
      setLocation('/auth');
      return;
    }
    followMutation.mutate();
  };

  const genreTags = (profile.userType || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const gameClips = (clips || []).filter((c) => c.videoType !== 'reel');
  const reels = (clips || []).filter((c) => c.videoType === 'reel');

  return (
    <div style={{ background: brand.bg, minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: 'white' }}>
      <section
        className="relative w-full pt-32 pb-16 px-6 md:px-12 flex flex-col items-center justify-center border-b border-white/5"
        style={{ background: 'linear-gradient(135deg, #0B1319 0%, #1a0b30 50%, #0d1f2d 100%)' }}
      >
        {igHeaderImageUrl && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img
              src={igHeaderImageUrl}
              alt=""
              className="w-full h-full object-cover object-center opacity-20"
              style={{ filter: 'blur(2px) saturate(1.4)', transform: 'scale(1.05)' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(11,19,25,0.85) 0%, rgba(26,11,48,0.80) 50%, rgba(13,31,45,0.85) 100%)' }} />
          </div>
        )}
        {!igHeaderImageUrl && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.15)_0%,transparent_50%)] pointer-events-none"></div>
        )}

        <div className="relative z-20 max-w-5xl w-full mx-auto flex flex-col items-center text-center">
          {profile.avatarUrl && (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="w-24 h-24 rounded-full object-cover mb-6 border-2"
              style={{ borderColor: brand.accent }}
            />
          )}

          {genreTags.length > 0 && (
            <div className="flex gap-3 mb-6 flex-wrap justify-center">
              {genreTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full"
                  style={{ background: brand.accent, color: '#0B1319' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-3 text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            {profile.displayName}
          </h1>
          <p className="text-white/50 mb-8">@{profile.username}</p>

          {profile.bio && (
            <p className="max-w-2xl text-white/70 mb-8">{profile.bio}</p>
          )}

          {isOwnProfile ? (
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <a
                href="/studio-dashboard"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg font-bold text-black transition-all hover:scale-105"
                style={{ background: brand.accent }}
              >
                <SlidersHorizontal size={18} />
                Game Dashboard
              </a>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8 w-full sm:w-auto">
              <button
                onClick={handleFollowClick}
                disabled={followMutation.isPending}
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg font-bold text-black transition-all hover:scale-105 disabled:opacity-60"
                style={{ background: brand.accent, ...glowStyle }}
              >
                {isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}
                {isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}
              </button>
              <button
                onClick={() => (currentUser ? setMessageDialogOpen(true) : setLocation('/auth'))}
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg font-bold text-white transition-all hover:bg-white/5 border border-white/20"
              >
                <MessageCircle size={18} />
                Message
              </button>
              <ReportOwnershipButton
                username={profile.username}
                displayName={profile.displayName}
                variant="minimal"
                size="sm"
                className="px-2"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 w-full sm:w-auto">
            {[
              { label: 'Followers', value: profile._count?.followers ?? 0, icon: Users },
              { label: 'Total Views', value: profile._count?.clipViews ?? 0, icon: Eye },
              { label: 'Fires', value: profile._count?.firesReceived ?? 0, icon: Flame },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-4 rounded-lg" style={cardStyle}>
                <stat.icon size={22} color={brand.accent} className="opacity-90" />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: brand.textMuted }}>
                    {stat.label}
                  </div>
                  <div className="text-xl font-bold">{stat.value.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>

          <PlatformConnections
            profile={profile}
            className="!border-t-0 mt-6 pt-6 border-t border-white/10 w-full justify-center flex-wrap"
          />
        </div>
      </section>

      <nav className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl bg-[#0B1319]/80 px-6">
        <div className="max-w-6xl mx-auto flex overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-5 text-sm font-bold tracking-widest whitespace-nowrap transition-colors relative
                ${tab === activeTab ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
            >
              {tab}
              {tab === activeTab && (
                <div className="absolute bottom-0 left-0 w-full h-1" style={{ background: brand.accent, ...glowStyle }}></div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {activeTab === 'OVERVIEW' && (
        <section className="py-16 px-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {/* Trailer */}
            <div className="aspect-video rounded-lg overflow-hidden" style={cardStyle}>
              {igTrailerUrl ? (
                getVideoEmbedUrl(igTrailerUrl) ? (
                  <iframe
                    src={getVideoEmbedUrl(igTrailerUrl)!}
                    title={`${profile.displayName} trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : (
                  <video src={igTrailerUrl} controls className="w-full h-full object-cover" />
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ color: brand.textMuted }}>
                  <Play size={32} color={brand.accent} />
                  <span className="text-sm">No trailer added yet</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Overview</h2>
              <p className="text-lg leading-relaxed" style={{ color: brand.textMuted }}>
                {igDescription || (profile as any).bio || `${profile.displayName} hasn't added a game description yet.`}
              </p>
            </div>

            {/* Genres + Platforms */}
            {(igGenres.length > 0 || igPlatforms.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {igGenres.map((g, i) => (
                  <span key={`genre-${i}`} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: `rgba(183,255,24,0.1)`, border: `1px solid rgba(183,255,24,0.25)`, color: brand.accent }}>
                    <Tag size={11} />{g}
                  </span>
                ))}
                {igPlatforms.map((p, i) => {
                  const Icon = p === 'windows' || p === 'mac' || p === 'linux' ? Monitor
                    : p === 'ios' || p === 'android' ? Smartphone : Gamepad2;
                  const label = p === 'windows' ? 'Windows' : p === 'mac' ? 'macOS' : p === 'linux' ? 'Linux'
                    : p === 'ps5' ? 'PlayStation' : p === 'xbox' ? 'Xbox' : p === 'switch' ? 'Switch'
                    : p === 'ios' ? 'iOS' : p === 'android' ? 'Android' : p;
                  return (
                    <span key={`plat-${i}`} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
                      <Icon size={11} />{label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Screenshots */}
            {igScreenshots.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Screenshots</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {igScreenshots.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="aspect-video rounded-lg overflow-hidden block" style={cardStyle}>
                      <img src={url} alt={`${profile.displayName} screenshot ${i + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Key Features */}
            {igKeyFeatures.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Key Features</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {igKeyFeatures.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-lg" style={cardStyle}>
                      <CheckCircle2 color={brand.accent} size={20} className="shrink-0 mt-0.5" />
                      <span className="text-sm font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Level', value: profile.level ?? 1, icon: Star },
                { label: 'Total XP', value: (profile.totalXP ?? 0).toLocaleString(), icon: Award },
                { label: 'Streak', value: `${profile.currentStreak ?? 0}d`, icon: Flame },
                { label: 'Clips', value: profile._count?.clips ?? 0, icon: Video },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-lg flex flex-col items-center gap-2 text-center" style={cardStyle}>
                  <stat.icon size={20} color={brand.accent} />
                  <div className="text-lg font-bold">{stat.value}</div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: brand.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Studio / Game Info Card */}
            <div className="p-6 space-y-5" style={{ ...cardStyle, boxShadow: `0 0 20px rgba(183, 255, 24, 0.15)` }}>
              <div>
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: brand.textMuted }}>Developer</div>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                  <Terminal size={18} color={brand.accent} />
                  {igStudioName || profile.displayName}
                </div>
              </div>

              {(igStudioFounded || igStudioSize || igStudioCountry) && (
                <div className="grid grid-cols-2 gap-4">
                  {igStudioFounded && (
                    <div>
                      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: brand.textMuted }}>Founded</div>
                      <div className="font-medium">{igStudioFounded}</div>
                    </div>
                  )}
                  {igStudioSize && (
                    <div>
                      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: brand.textMuted }}>Team Size</div>
                      <div className="font-medium">{igStudioSize}</div>
                    </div>
                  )}
                  {igStudioCountry && (
                    <div className="col-span-2">
                      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: brand.textMuted }}>Country</div>
                      <div className="font-medium">{igStudioCountry}</div>
                    </div>
                  )}
                </div>
              )}

              {(igReleaseDate || igReleaseStatus || igPrice) && (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  {igReleaseStatus && (
                    <div>
                      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: brand.textMuted }}>Status</div>
                      <span className="text-xs font-bold px-2 py-1 rounded-full"
                        style={{ background: `rgba(183,255,24,0.12)`, color: brand.accent, border: `1px solid rgba(183,255,24,0.25)` }}>
                        {igReleaseStatus === 'coming_soon' ? 'Coming Soon' : igReleaseStatus === 'early_access' ? 'Early Access' : 'Released'}
                      </span>
                    </div>
                  )}
                  {igReleaseDate && (
                    <div>
                      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: brand.textMuted }}>Release Date</div>
                      <div className="text-lg font-bold text-white">{igReleaseDate}</div>
                    </div>
                  )}
                  {igPrice && (
                    <div>
                      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: brand.textMuted }}>Price</div>
                      <div className="font-bold text-white">{igPrice}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Store Links */}
            {(igSteamUrl || igEpicUrl || igItchUrl) && (
              <div className="p-6 space-y-3" style={cardStyle}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-3">Get the Game</h3>
                {igSteamUrl && (
                  <a href={igSteamUrl} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 p-3 rounded-md bg-[#171a21] hover:bg-[#2a303c] transition-colors border border-white/5">
                    <SiSteam size={24} className="text-[#66c0f4]" />
                    <span className="font-semibold text-[#c7d5e0]">Steam</span>
                    {profile.steamVerifiedAt ? (
                      <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#66c0f4]">
                        <CheckCircle2 size={14} />
                        Verified
                      </span>
                    ) : (
                      <ExternalLink size={12} className="ml-auto opacity-40" />
                    )}
                  </a>
                )}
                {igEpicUrl && (
                  <a href={igEpicUrl} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 p-3 rounded-md bg-[#121212] hover:bg-[#2a2a2a] transition-colors border border-white/5">
                    <SiEpicgames size={24} className="text-white" />
                    <span className="font-semibold text-white">Epic Games</span>
                    {ig?.epicVerifiedAt ? (
                      <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#a855f7]">
                        <CheckCircle2 size={14} />
                        Verified
                      </span>
                    ) : (
                      <ExternalLink size={12} className="ml-auto opacity-40" />
                    )}
                  </a>
                )}
                {igItchUrl && (
                  <a href={igItchUrl} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-white/5 transition-colors border border-white/5"
                    style={{ background: 'rgba(250,92,92,0.08)' }}>
                    <SiItchdotio size={24} className="text-[#fa5c5c]" />
                    <span className="font-semibold text-white">itch.io</span>
                    {ig?.itchVerifiedAt ? (
                      <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#fa5c5c]">
                        <CheckCircle2 size={14} />
                        Verified
                      </span>
                    ) : (
                      <ExternalLink size={12} className="ml-auto opacity-40" />
                    )}
                  </a>
                )}
              </div>
            )}

            {/* Game Community page link */}
            <div className="pt-4 border-t border-white/10">
              <a
                href={`/indie-games/${profile.username}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-colors"
                style={{ background: 'rgba(183,255,24,0.08)', border: '1px solid rgba(183,255,24,0.2)', color: brand.accent }}
              >
                <Video size={15} />
                View Game Community
              </a>
            </div>

            {/* Social / Links */}
            {(igWebsiteUrl || igTwitterUrl || igDiscordUrl || igStudioWebsite) && (
              <div className="p-6 space-y-3" style={cardStyle}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-3">Links</h3>
                {(igWebsiteUrl || igStudioWebsite) && (
                  <a href={igWebsiteUrl ?? igStudioWebsite!} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:underline" style={{ color: brand.accent }}>
                    <Globe size={15} /> Website
                  </a>
                )}
                {igTwitterUrl && (
                  <a href={igTwitterUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-white/70 hover:text-white hover:underline">
                    <Twitter size={15} /> Twitter / X
                  </a>
                )}
                {igDiscordUrl && (
                  <a href={igDiscordUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-white/70 hover:text-white hover:underline">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-[#5865F2]"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.059.102 18.061.104 18.063a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                    Discord
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'CLIPS' && (
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Clips</h2>
          {gameClips.length === 0 ? (
            <p style={{ color: brand.textMuted }}>No clips yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {gameClips.map((clip) => (
                <div key={clip.id} className="aspect-video rounded-lg flex items-center justify-center relative overflow-hidden" style={cardStyle}>
                  {clip.thumbnailUrl ? (
                    <img src={clip.thumbnailUrl} alt={clip.title} className="w-full h-full object-cover" />
                  ) : (
                    <Video size={28} className="text-white/30" />
                  )}
                  <span className="absolute bottom-2 left-2 right-2 text-xs font-semibold bg-black/60 px-2 py-1 rounded truncate">
                    {clip.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'REELS' && (
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Reels</h2>
          {reels.length === 0 ? (
            <p style={{ color: brand.textMuted }}>No reels yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {reels.map((reel) => (
                <div key={reel.id} className="aspect-[9/16] rounded-lg flex items-center justify-center relative overflow-hidden" style={cardStyle}>
                  {reel.thumbnailUrl ? (
                    <img src={reel.thumbnailUrl} alt={reel.title} className="w-full h-full object-cover" />
                  ) : (
                    <Play size={28} className="text-white/30" />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'SCREENSHOTS' && (
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Screenshots</h2>
          {(screenshots || []).length === 0 ? (
            <p style={{ color: brand.textMuted }}>No screenshots yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {(screenshots || []).map((shot) => (
                <div key={shot.id} className="aspect-video rounded-lg flex items-center justify-center relative overflow-hidden" style={cardStyle}>
                  {shot.imageUrl ? (
                    <img src={shot.imageUrl} alt={shot.title} className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={28} className="text-white/30" />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'BOUNTIES' && (
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Bounty Campaigns</h2>
          {(bounties || []).length === 0 ? (
            <p style={{ color: brand.textMuted }}>
              {isOwnProfile
                ? "You haven't launched any bounty campaigns yet."
                : `${profile.displayName} hasn't launched any bounty campaigns yet.`}
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {(bounties || []).map((bounty) => {
                const isActive = bounty.status === 'active';
                return (
                  <Link
                    key={bounty.id}
                    href={`/games/${bounty.gameId}?tab=bounties`}
                    className="block p-6 rounded-lg transition-transform hover:scale-[1.02]"
                    style={cardStyle}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Sword size={18} color={brand.accent} />
                        <span
                          className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                          style={{
                            background: isActive ? 'rgba(183, 255, 24, 0.15)' : 'rgba(255,255,255,0.08)',
                            color: isActive ? brand.accent : brand.textMuted,
                          }}
                        >
                          {bounty.status}
                        </span>
                      </div>
                      {bounty.gameName && (
                        <span className="text-xs font-semibold text-white/50 truncate max-w-[45%]">{bounty.gameName}</span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">{bounty.campaignTitle || bounty.title}</h3>
                    {bounty.description && (
                      <p className="text-sm mb-4 line-clamp-2" style={{ color: brand.textMuted }}>
                        {bounty.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: brand.textMuted }}>
                      <div className="flex items-center gap-1.5">
                        <Users size={14} />
                        {bounty.participantCount ?? 0}/{bounty.maxParticipants ?? 10} joined
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award size={14} />
                        {(bounty.totalXpAvailable ?? 0).toLocaleString()} XP
                      </div>
                      {(bounty.fullKeysRemaining ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Key size={14} />
                          {bounty.fullKeysRemaining} keys left
                        </div>
                      )}
                      {bounty.endDate && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} />
                          {new Date(bounty.endDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {currentUser && (
        <React.Suspense fallback={null}>
          <MessageDialog
            open={messageDialogOpen}
            onOpenChange={setMessageDialogOpen}
            targetUser={{
              id: profile.id,
              username: profile.username,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
}
