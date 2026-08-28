import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { getQueryFn, queryClient } from '@/lib/queryClient';
import { GAME_DEVELOPER_FEATURES_ENABLED } from '@/lib/feature-flags';
import { ClipWithUser, IndieGameProfile, UserWithStats } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import PlatformConnections from '@/components/profile/PlatformConnections';
import { GameShareDialog } from '@/components/profile/GameShareDialog';
import VideoClipGridItem from '@/components/clips/VideoClipGridItem';
import { ScreenshotCard } from '@/components/screenshots/ScreenshotCard';
import HlsVideo from '@/components/media/HlsVideo';
import { getVideoEmbedUrl } from '@/lib/video-embed';
import { useSignedUrl, useSignedUrls } from '@/hooks/use-signed-url';
import { publicUrl } from '@/lib/platform';
import { SiEpicgames, SiItchdotio, SiSteam } from 'react-icons/si';
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Gamepad2,
  Globe,
  MessageCircle,
  Monitor,
  Play,
  Share2,
  Smartphone,
  UserCheck,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react';

const MessageDialog = React.lazy(() =>
  import('@/components/messages/MessageDialog').then((m) => ({ default: m.MessageDialog })),
);

const TABS = ['OVERVIEW', 'CLIPS', 'REELS', 'SCREENSHOTS'] as const;
type Tab = typeof TABS[number];
const VISIBLE_TABS = TABS;

type GameContentCounts = { clips: number; reels: number; screenshots: number };
type CanonicalGame = { id: number; name: string; imageUrl?: string | null };
type IndieResponse = { profile: IndieGameProfile; game: CanonicalGame | null };

interface Props {
  profile: UserWithStats;
  isOwnProfile: boolean;
}

const accent = '#B7FF18';
const surfaceStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.035)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 16,
};

function formatPlatform(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === 'windows') return 'Windows';
  if (normalized === 'mac') return 'macOS';
  if (normalized === 'ios') return 'iOS';
  if (normalized === 'ps5') return 'PlayStation';
  return value;
}

function PlatformIcon({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const Icon = ['windows', 'mac', 'linux'].includes(normalized)
    ? Monitor
    : ['ios', 'android'].includes(normalized)
      ? Smartphone
      : Gamepad2;
  return <Icon size={13} />;
}

function EmptyCommunityState({
  title,
  body,
  icon: Icon,
  action,
}: {
  title: string;
  body: string;
  icon: React.ElementType;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-8 text-center sm:px-8">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-[#B7FF18]">
        <Icon size={21} />
      </div>
      <h3 className="text-base font-black text-white">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-white/55">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export default function IndieGameProfileLayout({ profile, isOwnProfile }: Props) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [selectedGameId, setSelectedGameId] = useState<number | null>(() => {
    const rawGameId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('gameId') : null;
    const parsedGameId = rawGameId ? Number(rawGameId) : NaN;
    return Number.isFinite(parsedGameId) ? parsedGameId : null;
  });
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);

  const { data: gameListData } = useQuery<{ games: { id: number; gameName: string | null; headerImageUrl: string | null; capsuleImageUrl: string | null; isPrimary: boolean }[] }>({
    queryKey: [`/api/games/indie/${profile.username}/list`],
    queryFn: getQueryFn({ on401: 'throw' }),
    retry: false,
  });
  const gameList = gameListData?.games ?? [];
  const gameListImageSources = gameList.map((game) => game.capsuleImageUrl || game.headerImageUrl || null);
  const { getSignedUrl: getGameImageUrl } = useSignedUrls(gameListImageSources);

  const gameProfileQueryKey = selectedGameId
    ? [`/api/games/indie/${profile.username}`, { gameId: selectedGameId }]
    : [`/api/games/indie/${profile.username}`];
  const { data: indieData } = useQuery<IndieResponse | null>({
    queryKey: gameProfileQueryKey,
    queryFn: getQueryFn({ on401: 'throw' }),
    retry: false,
  });
  const gameProfile = indieData?.profile ?? null;
  const canonicalGame = indieData?.game ?? null;
  const canonicalGameId = canonicalGame?.id;

  const { data: gameContentData } = useQuery<ClipWithUser[] | null>({
    queryKey: ['/api/games', canonicalGameId, 'clips'],
    queryFn: () => fetch(`/api/games/${canonicalGameId}/clips?limit=100`, { credentials: 'include' }).then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch community clips');
      return res.json();
    }),
    enabled: !!canonicalGameId,
  });
  const gameContent = gameContentData ?? [];
  const { data: communityScreenshotData } = useQuery<any[] | null>({
    queryKey: ['/api/games', canonicalGameId, 'screenshots'],
    queryFn: () => fetch(`/api/games/${canonicalGameId}/screenshots?limit=100`, { credentials: 'include' }).then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch community screenshots');
      return res.json();
    }),
    enabled: !!canonicalGameId,
  });
  const communityScreenshots = communityScreenshotData ?? [];
  const { data: counts } = useQuery<GameContentCounts>({
    queryKey: ['/api/games', canonicalGameId, 'content-counts'],
    queryFn: () => fetch(`/api/games/${canonicalGameId}/content-counts`, { credentials: 'include' }).then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch game content counts');
      return res.json();
    }),
    enabled: !!canonicalGameId,
  });
  const { data: followStatus } = useQuery<{ status: 'following' | 'requested' | 'not_following' }>({
    queryKey: [`/api/users/${profile.username}/follow-status`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!currentUser && !isOwnProfile,
  });

  const clips = useMemo(() => gameContent.filter((clip) => clip.videoType !== 'reel'), [gameContent]);
  const reels = useMemo(() => gameContent.filter((clip) => clip.videoType === 'reel'), [gameContent]);
  const isFollowing = followStatus?.status === 'following';
  const isRequested = followStatus?.status === 'requested';
  const gameName = gameProfile?.gameName?.trim() || canonicalGame?.name || profile.displayName;
  const description = gameProfile?.fullDescription || gameProfile?.shortDescription || null;
  const header = gameProfile?.headerImageUrl || gameProfile?.capsuleImageUrl || canonicalGame?.imageUrl || null;
  const capsule = gameProfile?.capsuleImageUrl || canonicalGame?.imageUrl || null;
  const { signedUrl: displayHeader } = useSignedUrl(header);
  const { signedUrl: displayCapsule } = useSignedUrl(capsule);
  const { signedUrl: displayDeveloperAvatar } = useSignedUrl(profile.avatarUrl);
  const trailer = gameProfile?.trailerUrl || null;
  const genres = gameProfile?.genres ?? [];
  const platforms = gameProfile?.platforms ?? [];
  const storeLinks = [
    gameProfile?.steamUrl ? { name: 'Steam', url: gameProfile.steamUrl, icon: SiSteam } : null,
    gameProfile?.epicUrl ? { name: 'Epic Games', url: gameProfile.epicUrl, icon: SiEpicgames } : null,
    gameProfile?.itchUrl ? { name: 'itch.io', url: gameProfile.itchUrl, icon: SiItchdotio } : null,
  ].filter(Boolean) as { name: string; url: string; icon: React.ElementType }[];
  const whereToPlayLinks = [
    ...storeLinks,
    gameProfile?.websiteUrl ? { name: 'Official website', url: gameProfile.websiteUrl, icon: Globe } : null,
  ].filter(Boolean) as { name: string; url: string; icon: React.ElementType }[];
  const primaryStore = storeLinks[0];
  const statItems = [
    { label: 'Clips', value: counts?.clips ?? clips.length, icon: Play },
    { label: 'Reels', value: counts?.reels ?? reels.length, icon: Video },
    { label: 'Screenshots', value: counts?.screenshots ?? communityScreenshots.length, icon: Camera },
  ].filter((item) => item.value > 0);
  const hasCommunityHighlights = clips.length > 0 || reels.length > 0;
  const uploadHref = canonicalGameId
    ? `/upload?type=clips&gameId=${canonicalGameId}&gameName=${encodeURIComponent(gameName)}`
    : null;
  const profileStats = [
    { label: 'Following', value: profile._count?.following == null ? undefined : Number(profile._count.following) },
    { label: 'Followers', value: profile._count?.followers == null ? undefined : Number(profile._count.followers) },
    {
      label: 'Uploads',
      value: profile._count ? Number(profile._count.clips ?? 0) + Number(profile._count.screenshots ?? 0) : undefined,
    },
  ];

  const followMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/${profile.username}/follow`, {
        method: isFollowing || isRequested ? 'DELETE' : 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to update follow status');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/users/${profile.username}/follow-status`] }),
    onError: (error: Error) => toast({ description: error.message, variant: 'gamefolioError' }),
  });
  const jumpTo = (tab: Tab) => setActiveTab(tab);
  const visibleGameId = selectedGameId ?? gameList.find((game) => game.isPrimary)?.id ?? gameList[0]?.id;
  const selectGame = (gameId: number) => {
    setSelectedGameId(gameId);
    setActiveTab('OVERVIEW');
    const url = new URL(window.location.href);
    url.searchParams.set('gameId', String(gameId));
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };
  const sharedGameId = selectedGameId ?? visibleGameId;
  const gameShareUrl = publicUrl(`/studio/${encodeURIComponent(profile.username)}${sharedGameId != null ? `?gameId=${sharedGameId}` : ''}`);

  return (
    <div className="min-h-screen bg-[#080d11] pb-20 text-white">
      <section className="relative isolate overflow-hidden border-b border-white/10">
        {displayHeader ? (
          <img src={displayHeader} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-70" />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(8,13,17,.72)_0%,rgba(8,13,17,.28)_48%,rgba(8,13,17,.5)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-[#080d11] to-transparent" />
        <div className="mx-auto max-w-7xl px-5 pb-10 pt-28 sm:px-8 lg:pb-14 lg:pt-36">
          {gameList.length > 1 && (
            <div className="mb-8 flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Choose a game">
              {gameList.map((game) => {
                const active = visibleGameId === game.id;
                const gameImage = getGameImageUrl(game.capsuleImageUrl || game.headerImageUrl);
                return (
                  <button
                    type="button"
                    key={game.id}
                    onClick={() => selectGame(game.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${active ? 'border-[#B7FF18]/50 bg-[#B7FF18]/10 text-white' : 'border-white/10 bg-black/20 text-white/55 hover:bg-white/5'}`}
                  >
                    {gameImage ? <img src={gameImage} alt="" className="h-7 w-10 rounded object-cover" /> : <Gamepad2 size={15} />}
                    <span className="max-w-36 truncate">{game.gameName || 'Untitled game'}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.78fr)] lg:gap-12">
            {(displayHeader || displayCapsule) && (
              <div className="relative order-2 overflow-hidden rounded-3xl border border-white/15 bg-[#0d151b] shadow-2xl shadow-black/40">
                <div className="aspect-[16/10]">
                  {displayHeader ? (
                    <img src={displayHeader} alt={`${gameName} banner artwork`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[#101923]">
                      <Gamepad2 size={48} className="text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />
                </div>
                {displayCapsule && (
                  <img src={displayCapsule} alt={`${gameName} icon`} className="absolute bottom-5 left-5 h-24 w-[72px] rounded-2xl border-2 border-white/30 object-cover shadow-2xl sm:h-32 sm:w-24" />
                )}
              </div>
            )}

            <div className="order-1 min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#B7FF18]">
                <Gamepad2 size={14} />
                <span>Indie game</span>
                {gameProfile?.releaseStatus && (
                  <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-1 tracking-[0.12em] text-white/65">
                    {gameProfile.releaseStatus === 'coming_soon' ? 'Coming soon' : gameProfile.releaseStatus === 'early_access' ? 'Early access' : gameProfile.releaseStatus === 'released' ? 'Available now' : gameProfile.releaseStatus}
                  </span>
                )}
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">{gameName}</h1>
              <p className="mt-3 text-sm font-semibold text-white/50">By @{profile.username}</p>
              {description && <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75">{description}</p>}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                {primaryStore && (
                  <a href={primaryStore.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-[#B7FF18] px-5 py-3 text-sm font-black text-black hover:brightness-110">
                    <Play size={16} fill="currentColor" />
                    Play / buy
                  </a>
                )}
                {!isOwnProfile && (
                  <button
                    onClick={() => currentUser ? followMutation.mutate() : setLocation('/auth')}
                    disabled={followMutation.isPending}
                    aria-label={`${isFollowing ? 'Following' : isRequested ? 'Follow request pending for' : 'Follow'} @${profile.username}`}
                    className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/20 px-5 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-50"
                  >
                    {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                    {isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}
                  </button>
                )}
                {!isOwnProfile && (
                  <button onClick={() => currentUser ? setMessageDialogOpen(true) : setLocation('/auth')} className="rounded-xl border border-white/20 bg-black/20 p-3 hover:bg-white/10" aria-label="Message developer">
                    <MessageCircle size={18} />
                  </button>
                )}
                <button onClick={() => setShareDialogOpen(true)} className="rounded-xl border border-white/20 bg-black/20 p-3 hover:bg-white/10" aria-label="Share game">
                  <Share2 size={18} />
                </button>
                <div className="flex items-stretch gap-3 px-1 py-1 text-xs" aria-label="Developer profile statistics">
                  {profileStats.map(({ label, value }, index) => (
                    <div key={label} className={`min-w-[58px] text-center sm:min-w-[68px] ${index > 0 ? 'border-l border-white/10 pl-3 sm:pl-4' : ''}`}>
                      <div className="text-sm font-black text-white">{value == null ? '—' : value.toLocaleString()}</div>
                      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/40">{label}</div>
                    </div>
                  ))}
                </div>
                {isOwnProfile && GAME_DEVELOPER_FEATURES_ENABLED && (
                  <Link href={`/game-dashboard?tab=game-profile${gameProfile?.id ? `&gameId=${gameProfile.id}` : ''}`} className="rounded-xl border border-[#B7FF18]/30 bg-[#B7FF18]/10 px-5 py-3 text-sm font-black text-[#B7FF18] hover:bg-[#B7FF18]/20">
                    Game dashboard
                  </Link>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#080d11]/95 px-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl overflow-x-auto">
          {VISIBLE_TABS.map((tab) => (
            <button key={tab} onClick={() => jumpTo(tab)} className={`relative shrink-0 px-4 py-4 text-xs font-black tracking-[0.13em] ${activeTab === tab ? 'text-white' : 'text-white/45 hover:text-white/80'}`}>
              {tab}
              {activeTab === tab && <span className="absolute inset-x-4 bottom-0 h-0.5 bg-[#B7FF18]" />}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {!canonicalGameId && (
          <div className="mb-8 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100/80">
            Community uploads will appear once this game is connected to the Gamefolio catalogue.
          </div>
        )}

        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8">
            {statItems.length > 0 && (
              <div className={`grid gap-3 ${statItems.length === 1 ? 'sm:grid-cols-1' : statItems.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                {statItems.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3 p-4" style={surfaceStyle}>
                    <Icon size={17} className="text-[#B7FF18]" />
                    <div>
                      <div className="text-xl font-black">{value.toLocaleString()}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/45">{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <div className="space-y-8">
                {trailer && (
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#B7FF18]">Watch</p>
                        <h2 className="mt-1 text-xl font-black">Official trailer</h2>
                      </div>
                    </div>
                    <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
                      {getVideoEmbedUrl(trailer) ? (
                        <iframe src={getVideoEmbedUrl(trailer)!} title={`${gameName} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full" />
                      ) : (
                        <HlsVideo src={trailer} controls className="h-full w-full object-cover" />
                      )}
                    </div>
                  </section>
                )}

                {communityScreenshots.length > 0 && (
                  <section>
                    <div className="mb-4 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#B7FF18]">Game media</p>
                        <h2 className="mt-1 text-xl font-black">Screenshots</h2>
                      </div>
                      <button onClick={() => jumpTo('SCREENSHOTS')} className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#B7FF18]">
                        View all <ChevronRight size={14} />
                      </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {communityScreenshots.slice(0, 4).map((shot) => <ScreenshotCard key={shot.id} screenshot={shot} profile={profile} showUserInfo onSelect={setSelectedScreenshot} />)}
                    </div>
                  </section>
                )}

                {hasCommunityHighlights ? (
                <section>
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#B7FF18]">From the community</p>
                      <h2 className="mt-1 text-xl font-black">Community highlights</h2>
                    </div>
                    {hasCommunityHighlights && (
                      <button onClick={() => jumpTo(clips.length ? 'CLIPS' : 'SCREENSHOTS')} className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#B7FF18]">
                        View all <ChevronRight size={14} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-8">
                    {clips.length > 0 && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {clips.slice(0, 4).map((clip) => <VideoClipGridItem key={clip.id} clip={clip} clipsList={clips} />)}
                      </div>
                    )}
                  </div>
                </section>
                ) : !communityScreenshots.length ? (
                  <section>
                    <EmptyCommunityState
                      title="No community content yet"
                      body={`Clips, reels and screenshots shared for ${gameName} will appear here.`}
                      icon={Gamepad2}
                      action={isOwnProfile && uploadHref ? (
                        <Link href={uploadHref} className="inline-flex items-center gap-2 rounded-lg bg-[#B7FF18] px-4 py-2.5 text-xs font-black text-black hover:brightness-110">
                          <Play size={14} fill="currentColor" /> Upload a clip
                        </Link>
                      ) : null}
                    />
                  </section>
                ) : null}
              </div>

              <aside className="space-y-5">
                <section className="p-5 sm:p-6" style={surfaceStyle}>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#B7FF18]">About the game</p>
                  {description ? <p className="mt-3 text-sm leading-relaxed text-white/70">{description}</p> : <p className="mt-3 text-sm text-white/40">No game description has been added yet.</p>}
                  {genres.length > 0 && (
                    <div className="mt-5">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/35">Genres</p>
                      <div className="flex flex-wrap gap-2">
                        {genres.map((genre) => <span key={genre} className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-white/75">{genre}</span>)}
                      </div>
                    </div>
                  )}
                  {gameProfile?.keyFeatures?.length ? (
                    <div className="mt-5">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/35">Key features</p>
                      <ul className="space-y-2 text-sm text-white/70">
                        {gameProfile.keyFeatures.map((feature) => <li key={feature} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#B7FF18]" />{feature}</li>)}
                      </ul>
                    </div>
                  ) : null}
                </section>

                {platforms.length > 0 && (
                  <section className="p-5" style={surfaceStyle}>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">Platforms</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {platforms.map((platform) => <span key={platform} className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/75"><PlatformIcon value={platform} />{formatPlatform(platform)}</span>)}
                    </div>
                  </section>
                )}

                {whereToPlayLinks.length > 0 && (
                  <section className="p-5" style={surfaceStyle}>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">Where to play</p>
                    <div className="mt-4 space-y-2">
                      {whereToPlayLinks.map((store) => {
                        const Icon = store.icon;
                        return <a key={store.name} href={store.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm font-bold hover:bg-white/[0.06]"><Icon size={19} /><span>{store.name}</span><ExternalLink size={13} className="ml-auto text-white/40" /></a>;
                      })}
                    </div>
                  </section>
                )}

                <section className="p-5" style={surfaceStyle}>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">Developer</p>
                  <Link href={`/profile/${profile.username}`} className="mt-3 flex items-center gap-3 rounded-xl p-1 -m-1 transition-colors hover:bg-white/[0.05]">
                    {displayDeveloperAvatar ? <img src={displayDeveloperAvatar} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"><Users size={18} /></div>}
                    <div className="min-w-0">
                      <p className="truncate font-bold">{gameProfile?.studioName || profile.displayName}</p>
                      <p className="text-xs text-white/45">@{profile.username}</p>
                    </div>
                    <ChevronRight size={16} className="ml-auto shrink-0 text-white/30" />
                  </Link>
                  <PlatformConnections profile={profile} className="mt-4 !border-t-0 !px-0 !py-0" />
                </section>
              </aside>
            </div>
          </div>
        )}

        {activeTab === 'CLIPS' && (
          <section>
            <h2 className="mb-5 text-2xl font-black">Community clips</h2>
            {clips.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{clips.map((clip) => <VideoClipGridItem key={clip.id} clip={clip} clipsList={clips} />)}</div> : <EmptyCommunityState title="No clips yet" body={`No one has posted a ${gameName} clip yet.`} icon={Play} action={isOwnProfile && uploadHref ? <Link href={uploadHref} className="inline-flex items-center gap-2 rounded-lg bg-[#B7FF18] px-4 py-2.5 text-xs font-black text-black hover:brightness-110"><Play size={14} fill="currentColor" /> Upload a clip</Link> : null} />}
          </section>
        )}
        {activeTab === 'REELS' && (
          <section>
            <h2 className="mb-5 text-2xl font-black">Community reels</h2>
            {reels.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{reels.map((reel) => <VideoClipGridItem key={reel.id} clip={reel} reelsList={reels} />)}</div> : <EmptyCommunityState title="No reels yet" body={`Short-form ${gameName} moments will appear here.`} icon={Video} />}
          </section>
        )}
        {activeTab === 'SCREENSHOTS' && (
          <section>
            <h2 className="mb-5 text-2xl font-black">Community screenshots</h2>
            {communityScreenshots.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{communityScreenshots.map((shot) => <ScreenshotCard key={shot.id} screenshot={shot} profile={profile} showUserInfo onSelect={setSelectedScreenshot} />)}</div> : <EmptyCommunityState title="No screenshots yet" body={`Players have not shared screenshots from ${gameName} yet.`} icon={Camera} />}
          </section>
        )}
      </main>

      <GameShareDialog
        gameName={gameName}
        gameIconUrl={displayCapsule}
        bannerUrl={displayHeader}
        shareUrl={gameShareUrl}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
      {selectedScreenshot && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-5" onClick={() => setSelectedScreenshot(null)}><button onClick={() => setSelectedScreenshot(null)} className="absolute right-5 top-5 rounded-full border border-white/20 p-2"><X size={20} /></button><img src={selectedScreenshot.imageUrl} alt={selectedScreenshot.title} className="max-h-full max-w-full rounded-lg object-contain" onClick={(event) => event.stopPropagation()} /></div>}
      {currentUser && <React.Suspense fallback={null}><MessageDialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen} targetUser={{ id: profile.id, username: profile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl }} /></React.Suspense>}
    </div>
  );
}