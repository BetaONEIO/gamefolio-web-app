import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { apiRequest, getQueryFn, queryClient } from '@/lib/queryClient';
import { ClipWithUser, IndieGameProfile, UserWithStats } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import PlatformConnections from '@/components/profile/PlatformConnections';
import VideoClipGridItem from '@/components/clips/VideoClipGridItem';
import { ScreenshotCard } from '@/components/screenshots/ScreenshotCard';
import HlsVideo from '@/components/media/HlsVideo';
import { getVideoEmbedUrl } from '@/lib/video-embed';
import { useSignedUrl, useSignedUrls } from '@/hooks/use-signed-url';
import { SiEpicgames, SiItchdotio, SiSteam } from 'react-icons/si';
import {
  Award,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Gamepad2,
  Globe,
  Key,
  MessageCircle,
  Monitor,
  Pencil,
  Play,
  Settings,
  Share2,
  Smartphone,
  Sword,
  Tag,
  UserCheck,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react';

const MessageDialog = React.lazy(() =>
  import('@/components/messages/MessageDialog').then((m) => ({ default: m.MessageDialog })),
);

const TABS = ['OVERVIEW', 'CLIPS', 'REELS', 'SCREENSHOTS', 'BOUNTIES'] as const;
type Tab = typeof TABS[number];

type Bounty = {
  id: number;
  title: string;
  campaignTitle?: string | null;
  description?: string | null;
  status?: string | null;
  participantCount?: number | null;
  maxParticipants?: number | null;
  totalXpAvailable?: number | null;
  fullKeysRemaining?: number | null;
  endDate?: string | null;
};

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

function EmptyCommunityState({ title, body, icon: Icon }: { title: string; body: string; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] text-[#B7FF18]">
        <Icon size={27} />
      </div>
      <h3 className="text-lg font-black text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/55">{body}</p>
    </div>
  );
}

function BountyCard({ bounty, gameId }: { bounty: Bounty; gameId: number }) {
  const active = bounty.status === 'active';
  return (
    <Link
      href={`/games/${gameId}?tab=bounties`}
      className="block p-5 transition-transform hover:-translate-y-1"
      style={surfaceStyle}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[#B7FF18]">
          <Sword size={18} />
          <span className="text-[11px] font-black uppercase tracking-[0.16em]">{active ? 'Open bounty' : bounty.status || 'Campaign'}</span>
        </div>
        {bounty.endDate && (
          <span className="flex items-center gap-1 text-xs text-white/45"><Clock size={12} />{new Date(bounty.endDate).toLocaleDateString()}</span>
        )}
      </div>
      <h3 className="text-lg font-black text-white">{bounty.campaignTitle || bounty.title}</h3>
      {bounty.description && <p className="mt-2 line-clamp-2 text-sm text-white/55">{bounty.description}</p>}
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/50">
        <span className="flex items-center gap-1.5"><Users size={13} />{bounty.participantCount ?? 0}/{bounty.maxParticipants ?? 10} joined</span>
        {(bounty.totalXpAvailable ?? 0) > 0 && <span className="flex items-center gap-1.5"><Award size={13} />{(bounty.totalXpAvailable ?? 0).toLocaleString()} XP</span>}
        {(bounty.fullKeysRemaining ?? 0) > 0 && <span className="flex items-center gap-1.5"><Key size={13} />{bounty.fullKeysRemaining} keys</span>}
      </div>
    </Link>
  );
}

export default function IndieGameProfileLayout({ profile, isOwnProfile }: Props) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(profile.displayName ?? '');
  const [editBio, setEditBio] = useState(profile.bio ?? '');
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

  const { data: gameContent = [] } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/games', canonicalGameId, 'clips'],
    queryFn: () => fetch(`/api/games/${canonicalGameId}/clips?limit=100`, { credentials: 'include' }).then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch community clips');
      return res.json();
    }),
    enabled: !!canonicalGameId,
  });
  const { data: communityScreenshots = [] } = useQuery<any[]>({
    queryKey: ['/api/games', canonicalGameId, 'screenshots'],
    queryFn: () => fetch(`/api/games/${canonicalGameId}/screenshots?limit=100`, { credentials: 'include' }).then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch community screenshots');
      return res.json();
    }),
    enabled: !!canonicalGameId,
  });
  const { data: counts } = useQuery<GameContentCounts>({
    queryKey: ['/api/games', canonicalGameId, 'content-counts'],
    queryFn: () => fetch(`/api/games/${canonicalGameId}/content-counts`, { credentials: 'include' }).then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch game content counts');
      return res.json();
    }),
    enabled: !!canonicalGameId,
  });
  const { data: bounties = [] } = useQuery<Bounty[]>({
    queryKey: ['/api/games', canonicalGameId, 'bounties'],
    queryFn: () => fetch(`/api/games/${canonicalGameId}/bounties`, { credentials: 'include' }).then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch game bounties');
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
  const activeBounties = bounties.filter((bounty) => bounty.status === 'active');
  const isFollowing = followStatus?.status === 'following';
  const isRequested = followStatus?.status === 'requested';
  const gameName = gameProfile?.gameName?.trim() || canonicalGame?.name || profile.displayName;
  const description = gameProfile?.fullDescription || gameProfile?.shortDescription || profile.bio;
  const header = gameProfile?.headerImageUrl || gameProfile?.capsuleImageUrl || canonicalGame?.imageUrl || null;
  const { signedUrl: displayHeader } = useSignedUrl(header);
  const trailer = gameProfile?.trailerUrl || null;
  const genres = gameProfile?.genres ?? [];
  const platforms = gameProfile?.platforms ?? [];
  const storeLinks = [
    gameProfile?.steamUrl ? { name: 'Steam', url: gameProfile.steamUrl, icon: SiSteam } : null,
    gameProfile?.epicUrl ? { name: 'Epic Games', url: gameProfile.epicUrl, icon: SiEpicgames } : null,
    gameProfile?.itchUrl ? { name: 'itch.io', url: gameProfile.itchUrl, icon: SiItchdotio } : null,
  ].filter(Boolean) as { name: string; url: string; icon: React.ElementType }[];
  const primaryStore = storeLinks[0];

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
  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', `/api/users/${profile.id}`, { displayName: editName.trim(), bio: editBio.trim() });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profile.username}`] });
      setEditing(false);
      toast({ description: 'Studio profile updated.' });
    },
    onError: (error: Error) => toast({ description: error.message || 'Could not save changes.', variant: 'gamefolioError' }),
  });

  const shareGame = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: gameName, text: `Check out ${gameName} on Gamefolio`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast({ description: 'Game link copied to your clipboard.' });
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') toast({ description: 'Could not share this game.', variant: 'gamefolioError' });
    }
  };

  const jumpTo = (tab: Tab) => setActiveTab(tab);
  const visibleGameId = selectedGameId ?? gameList.find((game) => game.isPrimary)?.id ?? gameList[0]?.id;

  return (
    <div className="min-h-screen bg-[#080d11] pb-20 text-white">
      <section className="relative isolate overflow-hidden border-b border-white/10">
        {displayHeader ? (
          <img src={displayHeader} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-50" />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(8,13,17,.98)_0%,rgba(8,13,17,.78)_47%,rgba(8,13,17,.92)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-[#080d11] to-transparent" />
        <div className="mx-auto max-w-7xl px-5 pb-10 pt-28 sm:px-8 lg:pt-36">
          {gameList.length > 1 && (
            <div className="mb-8 flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Choose a game">
              {gameList.map((game) => {
                const active = visibleGameId === game.id;
                return (
                  <button
                    type="button"
                    key={game.id}
                    onClick={() => { setSelectedGameId(game.id); setActiveTab('OVERVIEW'); }}
                    className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${active ? 'border-[#B7FF18]/50 bg-[#B7FF18]/10 text-white' : 'border-white/10 bg-black/20 text-white/55 hover:bg-white/5'}`}
                  >
                    {getGameImageUrl(game.capsuleImageUrl || game.headerImageUrl) ? <img src={getGameImageUrl(game.capsuleImageUrl || game.headerImageUrl)!} alt="" className="h-7 w-10 rounded object-cover" /> : <Gamepad2 size={15} />}
                    <span className="max-w-36 truncate">{game.gameName || 'Untitled game'}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap gap-2">
                {genres.map((genre) => <span key={genre} className="rounded-full border border-[#B7FF18]/25 bg-[#B7FF18]/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#B7FF18]">{genre}</span>)}
              </div>
              {editing ? (
                <div className="space-y-3">
                  <input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={60} className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-3xl font-black outline-none focus:border-[#B7FF18]/60" />
                  <textarea value={editBio} onChange={(event) => setEditBio(event.target.value)} maxLength={500} rows={3} className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-white/80 outline-none focus:border-[#B7FF18]/60" />
                  <div className="flex gap-2">
                    <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="rounded-lg bg-[#B7FF18] px-4 py-2 text-sm font-black text-black disabled:opacity-50">Save studio details</button>
                    <button onClick={() => setEditing(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-white/70">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">{gameName}</h1>
                  <p className="mt-3 text-sm font-semibold text-white/55">{gameProfile?.releaseStatus === 'coming_soon' ? 'Coming soon' : gameProfile?.releaseStatus === 'early_access' ? 'Early access' : gameProfile?.releaseStatus === 'released' ? 'Available now' : `A game by @${profile.username}`}</p>
                  {description && <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75">{description}</p>}
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              {primaryStore && <a href={primaryStore.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-[#B7FF18] px-5 py-3 text-sm font-black text-black hover:brightness-110"><Play size={16} fill="currentColor" />Play / Buy</a>}
              {!isOwnProfile && <button onClick={() => currentUser ? followMutation.mutate() : setLocation('/auth')} disabled={followMutation.isPending} className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/20 px-5 py-3 text-sm font-bold hover:bg-white/10">{isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}{isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}</button>}
              {!isOwnProfile && <button onClick={() => currentUser ? setMessageDialogOpen(true) : setLocation('/auth')} className="rounded-xl border border-white/20 bg-black/20 p-3 hover:bg-white/10" aria-label="Message developer"><MessageCircle size={18} /></button>}
              <button onClick={shareGame} className="rounded-xl border border-white/20 bg-black/20 p-3 hover:bg-white/10" aria-label="Share game"><Share2 size={18} /></button>
              {isOwnProfile && <><button onClick={() => setEditing(!editing)} className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-sm font-bold hover:bg-white/10"><Settings size={16} />Edit</button><a href="/indie/dashboard" className="rounded-xl bg-[#B7FF18] px-5 py-3 text-sm font-black text-black">Game dashboard</a></>}
            </div>
          </div>
        </div>
      </section>

      <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#080d11]/95 px-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl overflow-x-auto">
          {TABS.map((tab) => <button key={tab} onClick={() => jumpTo(tab)} className={`relative shrink-0 px-4 py-4 text-xs font-black tracking-[0.13em] ${activeTab === tab ? 'text-white' : 'text-white/45 hover:text-white/80'}`}>{tab}{activeTab === tab && <span className="absolute inset-x-4 bottom-0 h-0.5 bg-[#B7FF18]" />}</button>)}
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {!canonicalGameId && <div className="mb-8 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5 text-sm text-amber-100/80">Community uploads will appear here when this game is added to the Gamefolio game catalogue.</div>}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-10">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[{ label: 'Active bounties', value: activeBounties.length, icon: Sword }, { label: 'Game clips', value: counts?.clips ?? clips.length, icon: Play }, { label: 'Reels', value: counts?.reels ?? reels.length, icon: Video }, { label: 'Screenshots', value: counts?.screenshots ?? communityScreenshots.length, icon: Camera }].map(({ label, value, icon: Icon }) => <div key={label} className="p-4" style={surfaceStyle}><Icon size={18} className="mb-3 text-[#B7FF18]" /><div className="text-2xl font-black">{value.toLocaleString()}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/45">{label}</div></div>)}
            </div>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_290px]">
              <div className="space-y-8">
                {trailer && <section><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black">Official trailer</h2></div><div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">{getVideoEmbedUrl(trailer) ? <iframe src={getVideoEmbedUrl(trailer)!} title={`${gameName} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full" /> : <HlsVideo src={trailer} controls className="h-full w-full object-cover" />}</div></section>}
                <section>
                  <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">Featured community clips</h2>{clips.length > 0 && <button onClick={() => jumpTo('CLIPS')} className="flex items-center gap-1 text-xs font-bold text-[#B7FF18]">View all <ChevronRight size={14} /></button>}</div>
                  {clips.length ? <div className="grid gap-4 sm:grid-cols-2">{clips.slice(0, 4).map((clip) => <VideoClipGridItem key={clip.id} clip={clip} clipsList={clips} />)}</div> : <EmptyCommunityState title="No clips yet" body={`Be the first player to share a moment from ${gameName}.`} icon={Play} />}
                </section>
                {communityScreenshots.length > 0 && <section><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">Community screenshots</h2><button onClick={() => jumpTo('SCREENSHOTS')} className="flex items-center gap-1 text-xs font-bold text-[#B7FF18]">View all <ChevronRight size={14} /></button></div><div className="grid gap-4 sm:grid-cols-2">{communityScreenshots.slice(0, 4).map((shot) => <ScreenshotCard key={shot.id} screenshot={shot} profile={profile} showUserInfo onSelect={setSelectedScreenshot} />)}</div></section>}
                {activeBounties.length > 0 && <section><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">Creator bounties</h2><button onClick={() => jumpTo('BOUNTIES')} className="flex items-center gap-1 text-xs font-bold text-[#B7FF18]">View all <ChevronRight size={14} /></button></div><div className="grid gap-4 sm:grid-cols-2">{activeBounties.slice(0, 2).map((bounty) => <BountyCard key={bounty.id} bounty={bounty} gameId={canonicalGameId!} />)}</div></section>}
              </div>
              <aside className="space-y-5">
                <section className="p-5" style={surfaceStyle}><p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">About the game</p><p className="mt-3 text-sm leading-relaxed text-white/65">{description || 'The developer has not added a description yet.'}</p>{gameProfile?.keyFeatures?.length ? <ul className="mt-4 space-y-2 text-sm text-white/70">{gameProfile.keyFeatures.map((feature) => <li key={feature} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#B7FF18]" />{feature}</li>)}</ul> : null}</section>
                {(genres.length || platforms.length) > 0 && <section className="p-5" style={surfaceStyle}><p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">Details</p><div className="mt-4 space-y-4">{genres.length > 0 && <div><div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-white/60"><Tag size={13} />Genres</div><div className="flex flex-wrap gap-2">{genres.map((genre) => <span key={genre} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/75">{genre}</span>)}</div></div>}{platforms.length > 0 && <div><div className="mb-2 text-xs font-bold text-white/60">Platforms</div><div className="flex flex-wrap gap-2">{platforms.map((platform) => <span key={platform} className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/75"><PlatformIcon value={platform} />{formatPlatform(platform)}</span>)}</div></div>}</div></section>}
                {storeLinks.length > 0 && <section className="p-5" style={surfaceStyle}><p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">Get the game</p><div className="mt-4 space-y-2">{storeLinks.map((store) => { const Icon = store.icon; return <a key={store.name} href={store.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm font-bold hover:bg-white/[0.06]"><Icon size={19} /><span>{store.name}</span><ExternalLink size={13} className="ml-auto text-white/40" /></a>; })}</div></section>}
                <section className="p-5" style={surfaceStyle}><p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">Developer</p><div className="mt-3 flex items-center gap-3">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"><Users size={18} /></div>}<div><p className="font-bold">{gameProfile?.studioName || profile.displayName}</p><p className="text-xs text-white/45">@{profile.username}</p></div></div><PlatformConnections profile={profile} className="mt-4 !border-t-0 !px-0 !py-0" /></section>
              </aside>
            </div>
          </div>
        )}
        {activeTab === 'CLIPS' && <section><h2 className="mb-5 text-2xl font-black">Community clips</h2>{clips.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{clips.map((clip) => <VideoClipGridItem key={clip.id} clip={clip} clipsList={clips} />)}</div> : <EmptyCommunityState title="No clips yet" body={`No one has posted a ${gameName} clip yet. Be first to put the game on the map.`} icon={Play} />}</section>}
        {activeTab === 'REELS' && <section><h2 className="mb-5 text-2xl font-black">Community reels</h2>{reels.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{reels.map((reel) => <VideoClipGridItem key={reel.id} clip={reel} reelsList={reels} />)}</div> : <EmptyCommunityState title="No reels yet" body={`Short-form ${gameName} moments will appear here.`} icon={Video} />}</section>}
        {activeTab === 'SCREENSHOTS' && <section><h2 className="mb-5 text-2xl font-black">Community screenshots</h2>{communityScreenshots.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{communityScreenshots.map((shot) => <ScreenshotCard key={shot.id} screenshot={shot} profile={profile} showUserInfo onSelect={setSelectedScreenshot} />)}</div> : <EmptyCommunityState title="No screenshots yet" body={`Players have not shared screenshots from ${gameName} yet.`} icon={Camera} />}</section>}
        {activeTab === 'BOUNTIES' && <section><div className="mb-5"><h2 className="text-2xl font-black">Creator bounties</h2><p className="mt-1 text-sm text-white/55">Open creator campaigns for {gameName}.</p></div>{bounties.length && canonicalGameId ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{bounties.map((bounty) => <BountyCard key={bounty.id} bounty={bounty} gameId={canonicalGameId} />)}</div> : <EmptyCommunityState title="No bounties right now" body="There are no creator campaigns running for this game at the moment." icon={Sword} />}</section>}
      </main>

      {selectedScreenshot && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-5" onClick={() => setSelectedScreenshot(null)}><button onClick={() => setSelectedScreenshot(null)} className="absolute right-5 top-5 rounded-full border border-white/20 p-2"><X size={20} /></button><img src={selectedScreenshot.imageUrl} alt={selectedScreenshot.title} className="max-h-full max-w-full rounded-lg object-contain" onClick={(event) => event.stopPropagation()} /></div>}
      {currentUser && <React.Suspense fallback={null}><MessageDialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen} targetUser={{ id: profile.id, username: profile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl }} /></React.Suspense>}
    </div>
  );
}