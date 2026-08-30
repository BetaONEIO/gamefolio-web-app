import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { GAME_SOCIAL_LINKS } from '@/lib/indie-game-links';
import {
  SiAndroid,
  SiApple,
  SiEpicgames,
  SiItchdotio,
  SiLinux,
  SiNintendo,
  SiPlaystation,
  SiSteam,
} from 'react-icons/si';
import { FaWindows, FaXbox } from 'react-icons/fa6';
import {
  Camera,
  ChevronLeft,
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
type UploadSource = 'publisher' | 'community';
type PublicGameClip = ClipWithUser & { uploadSource: UploadSource };
type PublicGameScreenshot = {
  id: string | number;
  imageUrl: string;
  title?: string | null;
  userId?: number | null;
  uploadSource: UploadSource;
  [key: string]: unknown;
};

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
  if (['ps4', 'ps5', 'playstation'].includes(normalized)) return 'PlayStation';
  if (['switch', 'nintendo'].includes(normalized)) return 'Nintendo Switch';
  if (normalized === 'xbox') return 'Xbox';
  return value;
}

function PlatformIcon({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const icons: Record<string, React.ElementType> = {
    android: SiAndroid,
    epic: SiEpicgames,
    itch: SiItchdotio,
    itchio: SiItchdotio,
    linux: SiLinux,
    mac: SiApple,
    macos: SiApple,
    nintendo: SiNintendo,
    pc: FaWindows,
    playstation: SiPlaystation,
    ps4: SiPlaystation,
    ps5: SiPlaystation,
    steam: SiSteam,
    switch: SiNintendo,
    windows: FaWindows,
    xbox: FaXbox,
    ios: SiApple,
  };
  const Icon = icons[normalized] || Gamepad2;
  return <Icon size={13} />;
}

function UploadSourceBadge({
  source,
  className = '',
}: {
  source: UploadSource;
  className?: string;
}) {
  return (
    <span
      className={`pointer-events-none rounded-md border px-1.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] shadow-lg backdrop-blur-sm ${
        source === 'publisher'
          ? 'border-[#B7FF18]/35 bg-[#B7FF18]/85 text-[#07100A]'
          : 'border-white/20 bg-black/70 text-white/80'
      } ${className}`}
    >
      {source === 'publisher' ? 'Publisher' : 'Community'}
    </span>
  );
}

function ScreenshotCarousel({
  screenshots,
  onSelect,
}: {
  screenshots: PublicGameScreenshot[];
  onSelect: (screenshot: PublicGameScreenshot, trigger: HTMLButtonElement) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  if (screenshots.length === 0) return null;

  const scrollRail = (direction: 'previous' | 'next') => {
    railRef.current?.scrollBy({
      left: direction === 'next' ? railRef.current.clientWidth * 0.82 : -railRef.current.clientWidth * 0.82,
      behavior: 'smooth',
    });
  };

  return (
    <div className="group/rail relative">
      <div
        ref={railRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-hide"
        aria-label="Game screenshots"
      >
        {screenshots.map((screenshot, index) => (
          <button
            key={screenshot.id}
            type="button"
            onClick={(event) => onSelect(screenshot, event.currentTarget)}
            className="group/shot relative min-w-[min(78vw,360px)] snap-start overflow-hidden rounded-xl border border-white/10 bg-[#0B1218] text-left outline-none transition hover:border-white/25 focus-visible:ring-2 focus-visible:ring-[#B7FF1A] sm:min-w-[360px] lg:min-w-[410px]"
            aria-label={`View ${screenshot.title || `screenshot ${index + 1}`} full screen`}
          >
            <div className="aspect-video">
              <img
                src={screenshot.imageUrl}
                alt={screenshot.title || `Screenshot ${index + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover/shot:scale-[1.02]"
              />
            </div>
            <UploadSourceBadge
              source={screenshot.uploadSource}
              className="absolute left-3 top-3"
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-8 text-[10px] font-bold uppercase tracking-wider text-white/75 opacity-0 transition-opacity group-hover/shot:opacity-100 group-focus/shot:opacity-100">
              View full screen
            </span>
          </button>
        ))}
      </div>

      {screenshots.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollRail('previous')}
            aria-label="Previous screenshots"
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/15 bg-black/75 p-2 text-white shadow-lg transition hover:bg-black sm:flex sm:opacity-0 sm:group-hover/rail:opacity-100"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            onClick={() => scrollRail('next')}
            aria-label="Next screenshots"
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/15 bg-black/75 p-2 text-white shadow-lg transition hover:bg-black sm:flex sm:opacity-0 sm:group-hover/rail:opacity-100"
          >
            <ChevronRight size={17} />
          </button>
        </>
      )}
    </div>
  );
}

function EmptyCommunityState({
  title,
  body,
  icon: Icon,
  action,
  compact = false,
}: {
  title: string;
  body: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-center ${compact ? 'px-4 py-5 sm:px-5' : 'px-5 py-8 sm:px-8'}`}>
      <div className={`mx-auto flex items-center justify-center rounded-xl bg-white/[0.05] text-[#B7FF18] ${compact ? 'mb-2 h-9 w-9' : 'mb-3 h-11 w-11'}`}>
        <Icon size={compact ? 18 : 21} />
      </div>
      <h3 className={compact ? 'text-sm font-black text-white' : 'text-base font-black text-white'}>{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-white/55">{body}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function PublicMediaSection({
  title,
  description,
  emptyTitle,
  emptyBody,
  icon: Icon,
  action,
  children,
  hasContent,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyBody: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  hasContent: boolean;
}) {
  return (
    <section>
      <div className="mb-4">
        <h3 className="text-lg font-black text-white">{title}</h3>
        <p className="mt-1 text-sm text-white/50">{description}</p>
      </div>
      {hasContent ? children : (
        <EmptyCommunityState
          title={emptyTitle}
          body={emptyBody}
          icon={Icon}
          action={action}
          compact
        />
      )}
    </section>
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
  const [selectedScreenshotId, setSelectedScreenshotId] = useState<string | number | null>(null);
  const pageRootRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const closeLightboxButtonRef = useRef<HTMLButtonElement>(null);
  const lightboxReturnFocusRef = useRef<HTMLElement | null>(null);
  const gameScreenshotsRef = useRef<any[]>([]);
  const selectedScreenshotIdRef = useRef<string | number | null>(null);

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
  const profileScreenshotSources = Array.isArray(gameProfile?.screenshotUrls)
    ? gameProfile.screenshotUrls.filter((url): url is string => typeof url === 'string' && url.length > 0)
    : [];
  const { getSignedUrl: getProfileScreenshotUrl } = useSignedUrls(profileScreenshotSources);

  const { data: gameContentData } = useQuery<ClipWithUser[] | null>({
    queryKey: ['/api/games', canonicalGameId, 'clips'],
    queryFn: () => fetch(`/api/games/${canonicalGameId}/clips?limit=100`, { credentials: 'include' }).then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch community clips');
      return res.json();
    }),
    enabled: !!canonicalGameId,
  });
  const officialOwnerId = gameProfile?.userId ?? profile.id;
  const gameContent: PublicGameClip[] = useMemo(
    () => (gameContentData ?? []).map((clip) => ({
      ...clip,
      uploadSource: clip.userId === officialOwnerId || clip.user?.id === officialOwnerId ? 'publisher' : 'community',
    })),
    [gameContentData, officialOwnerId],
  );
  const { data: communityScreenshotData } = useQuery<any[] | null>({
    queryKey: ['/api/games', canonicalGameId, 'screenshots'],
    queryFn: () => fetch(`/api/games/${canonicalGameId}/screenshots?limit=100`, { credentials: 'include' }).then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch community screenshots');
      return res.json();
    }),
    enabled: !!canonicalGameId,
  });
  const communityScreenshotSources = (communityScreenshotData ?? [])
    .map((screenshot) => screenshot.imageUrl)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
  const { getSignedUrl: getCommunityScreenshotUrl } = useSignedUrls(communityScreenshotSources);
  const communityScreenshots: PublicGameScreenshot[] = (communityScreenshotData ?? [])
    .map((screenshot) => ({
      ...screenshot,
      sourceImageUrl: screenshot.imageUrl,
      imageUrl: getCommunityScreenshotUrl(screenshot.imageUrl) || '',
      uploadSource: screenshot.userId === officialOwnerId ? 'publisher' as const : 'community' as const,
    }))
    .filter((screenshot) => screenshot.imageUrl);
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
  const officialClips = useMemo(() => clips.filter((clip) => clip.uploadSource === 'publisher'), [clips]);
  const communityClips = useMemo(() => clips.filter((clip) => clip.uploadSource === 'community'), [clips]);
  const officialReels = useMemo(() => reels.filter((reel) => reel.uploadSource === 'publisher'), [reels]);
  const communityReels = useMemo(() => reels.filter((reel) => reel.uploadSource === 'community'), [reels]);
  const isFollowing = followStatus?.status === 'following';
  const isRequested = followStatus?.status === 'requested';
  const gameName = gameProfile?.gameName?.trim() || canonicalGame?.name || profile.displayName;
  const description = gameProfile?.fullDescription || gameProfile?.shortDescription || null;
  const profileScreenshots: PublicGameScreenshot[] = profileScreenshotSources
    .flatMap((url, index) => {
      const imageUrl = getProfileScreenshotUrl(url);
      return imageUrl ? [{
            id: `indie-profile-screenshot-${index}`,
            imageUrl,
            title: `${gameName} screenshot ${index + 1}`,
            userId: profile.id,
            user: {
              id: profile.id,
              username: profile.username,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
            },
            views: 0,
            uploadSource: 'publisher' as const,
          }] : [];
    });
  const officialScreenshots = useMemo(() => {
    const profileScreenshotKeys = new Set(profileScreenshotSources.map((url) => url.split('?')[0]));
    const linkedOfficialScreenshots = communityScreenshots.filter(
      (screenshot) => screenshot.uploadSource === 'publisher'
        && !profileScreenshotKeys.has(String(screenshot.sourceImageUrl ?? screenshot.imageUrl).split('?')[0]),
    );
    return [...profileScreenshots, ...linkedOfficialScreenshots];
  }, [communityScreenshots, profileScreenshotSources, profileScreenshots]);
  const communityGameScreenshots = useMemo(
    () => communityScreenshots.filter((screenshot) => screenshot.uploadSource === 'community'),
    [communityScreenshots],
  );
  const gameScreenshots = [...officialScreenshots, ...communityGameScreenshots];
  const screenshotCount = profileScreenshotSources.length + Number(counts?.screenshots ?? 0);
  const selectedScreenshotIndex = selectedScreenshotId === null
    ? -1
    : gameScreenshots.findIndex((screenshot) => screenshot.id === selectedScreenshotId);
  const selectedScreenshot = selectedScreenshotIndex >= 0
    ? gameScreenshots[selectedScreenshotIndex]
    : null;
  gameScreenshotsRef.current = gameScreenshots;
  selectedScreenshotIdRef.current = selectedScreenshotId;
  const isScreenshotViewerOpen = selectedScreenshot !== null;
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
  const gameSocialLinks = GAME_SOCIAL_LINKS.flatMap(({ field, label, color, borderColor, icon }) => {
    const url = gameProfile?.[field];
    return url ? [{ field, label, url, color, borderColor, icon }] : [];
  });
  const statItems = [
    { label: 'Clips', value: counts?.clips ?? clips.length, icon: Play },
    { label: 'Reels', value: counts?.reels ?? reels.length, icon: Video },
  ].filter((item) => item.value > 0);
  const hasCommunityHighlights = clips.length > 0 || reels.length > 0;
  const uploadHrefFor = (type: 'clips' | 'reels' | 'screenshots') => canonicalGameId
    ? `/upload?type=${type}&gameId=${canonicalGameId}&gameName=${encodeURIComponent(gameName)}`
    : null;
  const uploadHref = uploadHrefFor('clips');
  const profileStats = [
    { label: 'Following', value: profile._count?.following == null ? undefined : Number(profile._count.following) },
    { label: 'Followers', value: profile._count?.followers == null ? undefined : Number(profile._count.followers) },
    {
      label: 'Uploads',
      value: profile._count ? Number(profile._count.clips ?? 0) + Number(profile._count.screenshots ?? 0) : undefined,
    },
  ];

  useEffect(() => {
    if (!isScreenshotViewerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedScreenshotId(null);
      } else if (event.key === 'ArrowLeft') {
        const screenshots = gameScreenshotsRef.current;
        const currentIndex = screenshots.findIndex((screenshot) => screenshot.id === selectedScreenshotIdRef.current);
        if (currentIndex >= 0 && screenshots.length > 0) {
          setSelectedScreenshotId(screenshots[(currentIndex - 1 + screenshots.length) % screenshots.length].id);
        }
      } else if (event.key === 'ArrowRight') {
        const screenshots = gameScreenshotsRef.current;
        const currentIndex = screenshots.findIndex((screenshot) => screenshot.id === selectedScreenshotIdRef.current);
        if (currentIndex >= 0 && screenshots.length > 0) {
          setSelectedScreenshotId(screenshots[(currentIndex + 1) % screenshots.length].id);
        }
      } else if (event.key === 'Tab') {
        const focusable = Array.from(
          lightboxRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    const backgroundRoot = (pageRootRef.current?.closest('#root') as HTMLElement | null) ?? pageRootRef.current;
    const previousAriaHidden = backgroundRoot?.getAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
    backgroundRoot?.setAttribute('inert', '');
    backgroundRoot?.setAttribute('aria-hidden', 'true');
    window.requestAnimationFrame(() => closeLightboxButtonRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      backgroundRoot?.removeAttribute('inert');
      if (previousAriaHidden === null || previousAriaHidden === undefined) {
        backgroundRoot?.removeAttribute('aria-hidden');
      } else {
        backgroundRoot?.setAttribute('aria-hidden', previousAriaHidden);
      }
      lightboxReturnFocusRef.current?.focus();
    };
  }, [isScreenshotViewerOpen]);

  const openScreenshot = (screenshot: any, trigger?: HTMLElement) => {
    lightboxReturnFocusRef.current = trigger
      ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setSelectedScreenshotId(screenshot.id);
  };
  const moveScreenshot = (direction: 'previous' | 'next') => {
    if (selectedScreenshotIndex < 0 || gameScreenshots.length === 0) return;
    const nextIndex = direction === 'next'
      ? (selectedScreenshotIndex + 1) % gameScreenshots.length
      : (selectedScreenshotIndex - 1 + gameScreenshots.length) % gameScreenshots.length;
    setSelectedScreenshotId(gameScreenshots[nextIndex].id);
  };

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
    <div ref={pageRootRef} className="min-h-screen bg-[#080d11] pb-20 text-white">
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
                  <span className="tracking-[0.12em] text-[#B7FF18]">
                    {gameProfile.releaseStatus === 'coming_soon' ? 'Coming soon' : gameProfile.releaseStatus === 'early_access' ? 'Early access' : gameProfile.releaseStatus === 'released' ? 'Available now' : gameProfile.releaseStatus}
                  </span>
                )}
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">{gameName}</h1>
              <p className="mt-3 text-sm font-semibold text-white/50">By @{profile.username}</p>
              {description && <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75">{description}</p>}

              <div className="mt-7 flex flex-wrap items-center gap-2">
                <div className="flex items-stretch gap-3 px-1 py-2 text-xs" aria-label="Developer profile statistics">
                  {profileStats.map(({ label, value }, index) => (
                    <div key={label} className={`min-w-[64px] text-center sm:min-w-[72px] ${index > 0 ? 'border-l border-white/10 pl-3 sm:pl-4' : ''}`}>
                      <div className="text-base font-black text-white sm:text-lg">{value == null ? '—' : value.toLocaleString()}</div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">{label}</div>
                    </div>
                  ))}
                </div>
                {!isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentUser) {
                        followMutation.mutate();
                      } else {
                        setLocation('/auth');
                      }
                    }}
                    disabled={followMutation.isPending}
                    aria-label={`${isFollowing ? 'Following' : isRequested ? 'Follow request pending for' : 'Follow'} @${profile.username}`}
                    className="flex items-center gap-2 rounded-xl bg-[#B7FF18] px-5 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                    {isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}
                  </button>
                )}
                <div className="ml-2 flex items-center gap-2">
                  {!isOwnProfile && (
                    <button onClick={() => currentUser ? setMessageDialogOpen(true) : setLocation('/auth')} className="rounded-xl border border-white/20 bg-black/20 p-3 hover:bg-white/10" aria-label="Message developer">
                      <MessageCircle size={18} />
                    </button>
                  )}
                  <button onClick={() => setShareDialogOpen(true)} className="rounded-xl border border-white/20 bg-black/20 p-3 hover:bg-white/10" aria-label="Share game">
                    <Share2 size={18} />
                  </button>
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

                {gameScreenshots.length > 0 && (
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
                    <ScreenshotCarousel screenshots={gameScreenshots.slice(0, 4)} onSelect={openScreenshot} />
                  </section>
                )}

                {hasCommunityHighlights ? (
                <section>
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#B7FF18]">Publisher &amp; community</p>
                       <h2 className="mt-1 text-xl font-black">Game highlights</h2>
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
                        {gameProfile.keyFeatures.map((feature) => (
                          <li key={feature} className="flex items-center gap-2.5">
                            <img src="/attached_assets/gamefolio-logo-green.png" alt="" className="h-5 w-5 shrink-0 object-contain" />
                            <span>{feature}</span>
                          </li>
                        ))}
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

                {gameSocialLinks.length > 0 && (
                  <section className="p-5" style={surfaceStyle}>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">Connect with us</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {gameSocialLinks.map(({ field, label, url, color, borderColor, icon: Icon }) => (
                        <a
                          key={field}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${gameName} on ${label}`}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white transition-[filter] hover:brightness-110"
                          style={{ background: color, border: `1px solid ${borderColor}` }}
                        >
                          <Icon size={13} style={{ color: "#fff" }} aria-hidden="true" />
                          {label}
                        </a>
                      ))}
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
            <h2 className="mb-7 text-2xl font-black">Clips</h2>
            <div className="space-y-12">
              <PublicMediaSection
                title="Official Clips"
                description="Clips uploaded by the developer or publisher."
                emptyTitle="No official clips yet."
                emptyBody="The developer hasn't uploaded any clips for this game yet."
                icon={Play}
                hasContent={officialClips.length > 0}
                action={isOwnProfile && uploadHrefFor('clips') ? (
                  <Link href={uploadHrefFor('clips')!} className="inline-flex items-center gap-2 rounded-lg bg-[#B7FF18] px-4 py-2.5 text-xs font-black text-black transition hover:brightness-110">
                    <Play size={14} fill="currentColor" /> Upload a clip
                  </Link>
                ) : undefined}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
                  {officialClips.map((clip) => (
                    <VideoClipGridItem key={clip.id} clip={clip} clipsList={officialClips} />
                  ))}
                </div>
              </PublicMediaSection>

              <PublicMediaSection
                title="Community Clips"
                description="Clips shared by players, streamers and creators."
                emptyTitle="No community clips yet."
                emptyBody={`Be the first player to share a moment from ${gameName}.`}
                icon={Play}
                hasContent={communityClips.length > 0}
                action={currentUser && uploadHrefFor('clips') ? (
                  <Link href={uploadHrefFor('clips')!} className="inline-flex items-center gap-2 rounded-lg bg-[#B7FF18] px-4 py-2.5 text-xs font-black text-black transition hover:brightness-110">
                    <Play size={14} fill="currentColor" /> Upload a clip
                  </Link>
                ) : undefined}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
                  {communityClips.map((clip) => (
                    <VideoClipGridItem key={clip.id} clip={clip} clipsList={communityClips} />
                  ))}
                </div>
              </PublicMediaSection>
            </div>
          </section>
        )}
        {activeTab === 'REELS' && (
          <section>
            <h2 className="mb-7 text-2xl font-black">Reels</h2>
            <div className="space-y-12">
              <PublicMediaSection
                title="Official Reels"
                description="Reels uploaded by the developer or publisher."
                emptyTitle="No official reels yet."
                emptyBody="The developer hasn't uploaded any reels for this game yet."
                icon={Video}
                hasContent={officialReels.length > 0}
                action={isOwnProfile && uploadHrefFor('reels') ? (
                  <Link href={uploadHrefFor('reels')!} className="inline-flex items-center gap-2 rounded-lg bg-[#B7FF18] px-4 py-2.5 text-xs font-black text-black transition hover:brightness-110">
                    <Video size={14} /> Upload a reel
                  </Link>
                ) : undefined}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
                  {officialReels.map((reel) => (
                    <VideoClipGridItem key={reel.id} clip={reel} reelsList={officialReels} />
                  ))}
                </div>
              </PublicMediaSection>

              <PublicMediaSection
                title="Community Reels"
                description="Reels shared by players, streamers and creators."
                emptyTitle="No community reels yet."
                emptyBody={`Be the first player to share a reel from ${gameName}.`}
                icon={Video}
                hasContent={communityReels.length > 0}
                action={currentUser && uploadHrefFor('reels') ? (
                  <Link href={uploadHrefFor('reels')!} className="inline-flex items-center gap-2 rounded-lg bg-[#B7FF18] px-4 py-2.5 text-xs font-black text-black transition hover:brightness-110">
                    <Video size={14} /> Upload a reel
                  </Link>
                ) : undefined}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
                  {communityReels.map((reel) => (
                    <VideoClipGridItem key={reel.id} clip={reel} reelsList={communityReels} />
                  ))}
                </div>
              </PublicMediaSection>
            </div>
          </section>
        )}
        {activeTab === 'SCREENSHOTS' && (
          <section>
            <h2 className="mb-7 text-2xl font-black">Screenshots</h2>
            <div className="space-y-12">
              <PublicMediaSection
                title="Official Screenshots"
                description="Screenshots uploaded by the developer or publisher."
                emptyTitle="No official screenshots yet."
                emptyBody="The developer hasn't uploaded any screenshots for this game yet."
                icon={Camera}
                hasContent={officialScreenshots.length > 0}
                action={isOwnProfile && uploadHrefFor('screenshots') ? (
                  <Link href={uploadHrefFor('screenshots')!} className="inline-flex items-center gap-2 rounded-lg bg-[#B7FF18] px-4 py-2.5 text-xs font-black text-black transition hover:brightness-110">
                    <Camera size={14} /> Upload a screenshot
                  </Link>
                ) : undefined}
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {officialScreenshots.map((screenshot) => (
                    <ScreenshotCard
                      key={screenshot.id}
                      screenshot={screenshot}
                      profile={profile}
                      showUserInfo
                      authorDisplayName={gameName}
                      onSelect={(selected) => openScreenshot(selected)}
                    />
                  ))}
                </div>
              </PublicMediaSection>

              <PublicMediaSection
                title="Community Screenshots"
                description="Screenshots shared by players and creators."
                emptyTitle="No community screenshots yet."
                emptyBody={`Be the first player to share a screenshot from ${gameName}.`}
                icon={Camera}
                hasContent={communityGameScreenshots.length > 0}
                action={currentUser && uploadHrefFor('screenshots') ? (
                  <Link href={uploadHrefFor('screenshots')!} className="inline-flex items-center gap-2 rounded-lg bg-[#B7FF18] px-4 py-2.5 text-xs font-black text-black transition hover:brightness-110">
                    <Camera size={14} /> Upload a screenshot
                  </Link>
                ) : undefined}
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {communityGameScreenshots.map((screenshot) => (
                    <ScreenshotCard
                      key={screenshot.id}
                      screenshot={screenshot}
                      profile={profile}
                      showUserInfo
                      onSelect={(selected) => openScreenshot(selected)}
                    />
                  ))}
                </div>
              </PublicMediaSection>
            </div>
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
      {selectedScreenshot && createPortal(
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${gameName} screenshot viewer`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          onClick={() => setSelectedScreenshotId(null)}
        >
          <button
            ref={closeLightboxButtonRef}
            type="button"
            onClick={() => setSelectedScreenshotId(null)}
            aria-label="Close screenshot viewer"
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/40 p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
          {gameScreenshots.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); moveScreenshot('previous'); }}
                aria-label="Previous screenshot"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/55 p-3 text-white transition hover:bg-white/10 sm:left-6"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); moveScreenshot('next'); }}
                aria-label="Next screenshot"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/55 p-3 text-white transition hover:bg-white/10 sm:right-6"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <figure className="flex max-h-full max-w-6xl flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
            <img
              src={selectedScreenshot.imageUrl}
              alt={selectedScreenshot.title ?? gameName}
              className="max-h-[calc(100vh-7rem)] max-w-full rounded-lg object-contain shadow-2xl"
            />
            <figcaption className="text-center text-xs font-semibold text-white/60">
              {selectedScreenshot.title}
              {gameScreenshots.length > 1 && <span className="ml-2 text-white/35">{selectedScreenshotIndex + 1} / {gameScreenshots.length}</span>}
            </figcaption>
          </figure>
        </div>,
        document.body,
      )}
      {currentUser && <React.Suspense fallback={null}><MessageDialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen} targetUser={{ id: profile.id, username: profile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl }} /></React.Suspense>}
    </div>
  );
}