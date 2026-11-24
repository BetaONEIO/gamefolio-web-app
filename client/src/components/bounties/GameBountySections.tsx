import { ReelCard } from "@/components/clips/ReelCard";
import { TrendingClipMenu } from "@/components/clips/TrendingClipMenu";
import { useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { fetchSignedUrl, useSignedUrls } from '@/hooks/use-signed-url';
import { apiRequest, authedFetch } from '@/lib/queryClient';
import { isBountyCreatorParticipationRestricted } from '@/lib/bounty-creator-access';
import { bountyInstanceId } from '@shared/bounty-game-groups';
import { publicGamePath } from '@/lib/game-routes';
import VideoClipCard from '@/components/clips/VideoClipCard';
import { ScreenshotCard } from '@/components/screenshots/ScreenshotCard';
import { ScreenshotLightbox } from '@/components/screenshots/ScreenshotLightbox';
import { MobileScreenshotsViewer } from '@/components/screenshots/MobileScreenshotsViewer';
import { useClipDialog } from '@/hooks/use-clip-dialog';
import { useMobile } from '@/hooks/use-mobile';
import type { ClipWithUser } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const safeUrl = (value: unknown) => {
  try { const url = new URL(String(value ?? '')); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
};
export function bountyPlayUrl(campaign: any) {
  return [campaign.game_profile_steam_url, campaign.game_profile_itch_url, campaign.game_profile_epic_url, campaign.game_profile_website_url]
    .map(safeUrl).find(Boolean);
}

export function bountyKeylessAccessCopy(accessMethod: string | undefined, hasPlayLink: boolean) {
  const title = accessMethod === 'free_to_play' ? 'Free to play'
    : accessMethod === 'public_demo' ? 'Free demo' : 'No key required';
  const description = hasPlayLink
    ? 'No game key needed. Open the game in a new tab, then come back here to choose a bounty.'
    : 'No game key needed. Check the game page for details on where to play.';
  return { title, description };
}

const terminal = ['expired', 'cancelled', 'rejected', 'withdrawn', 'removed', 'completed', 'completed_and_verified', 'full_game_awarded'];

export function GameBountyAccess({ campaign, opportunities, onJoined }: { campaign: any; opportunities: any[]; onJoined: (campaign: any, result: any) => void }) {
  const { user } = useAuth(), { toast } = useToast(), qc = useQueryClient();
  const active = opportunities.find(item => item.participant_status && !terminal.includes(item.participant_status)) ?? campaign;
  const id = bountyInstanceId(active), joined = Boolean(active.is_joined || active.participant_status);
  const restricted = isBountyCreatorParticipationRestricted(user);
  const requiresKey = Boolean(active.requires_access_key) || ['demo_key', 'demo', 'full_game_upfront', 'full_upfront'].includes(active.access_method);
  const playUrl = bountyPlayUrl(active);
  const playDestination = playUrl ?? publicGamePath(active.catalog_game_name ?? active.game_profile_name ?? active.game_name);
  const keylessAccess = bountyKeylessAccessCopy(active.access_method, Boolean(playUrl));
  const [confirm, setConfirm] = useState(false), [revealed, setRevealed] = useState<{ id: number; key: string } | null>(null);
  useEffect(() => { setRevealed(null); setConfirm(false); }, [id]);
  const progress = useQuery<any>({ queryKey: ['/api/bounties/my', id], queryFn: async () => {
    const response = await authedFetch(`/api/bounties/my/${id}`, {method:"GET"}); if (!response.ok) throw new Error('Could not load your game access'); return response.json();
  }, enabled: !!user && joined && !restricted && requiresKey });
  const join = useMutation({ mutationFn: () => apiRequest('POST', `/api/bounties/${id}/join`, {}), onSuccess: async response => {
    const result = await response.json(); setConfirm(false);
    await qc.invalidateQueries({queryKey:['/api/bounties/my/campaigns']});
    await qc.invalidateQueries({queryKey:['/api/bounties']});
    if (['pending', 'application_pending'].includes(result.applicationStatus)) { toast({title:'Application submitted',description:'The developer will review your application before a key is reserved.'}); return; }
    onJoined({...active, instance_id:id, participant_status:result.status ?? 'joined', access_key_reserved:Boolean(result.accessKeyAvailable), deadline:result.deadline ?? null},result);
  }, onError: (error:any) => toast({title:'Could not claim access',description:error.message,variant:'destructive'}) });
  const reveal = useMutation({ mutationFn: () => apiRequest('POST', `/api/bounties/${id}/reveal-access-key`, {}), onSuccess: async response => {
    const result = await response.json();
    // Key plaintext stays only in this mounted panel, never query cache, storage or URLs.
    setRevealed(typeof result.key === 'string' && result.key ? {id,key:result.key} : null);
    await qc.invalidateQueries({queryKey:['/api/bounties/my',id]});
    await qc.invalidateQueries({queryKey:['/api/bounties/my/campaigns']});
    if (!result.key) toast({title:'Game access confirmed'});
  }, onError:(error:any)=>toast({title:'Could not reveal key',description:error.message,variant:'destructive'}) });
  const state = progress.data?.participant_status ?? active.participant_status;
  const locked = terminal.includes(state) || ['pending','pending_application','application_pending'].includes(state);
  const keysLeft = Number(active.access_method === 'full_game_upfront' ? active.full_access_keys_remaining : active.demo_keys_remaining);
  return <section id="bounty-claim-key" className="bounty-page-section" aria-labelledby="bounty-claim-title">
    <h2 id="bounty-claim-title"><KeyRound size={23} className="text-[#B9FF1A]" aria-hidden="true"/>{requiresKey?'Claim key':keylessAccess.title}</h2>
    <div className="bounty-access-section bounty-access-green">
    <div><p>{requiresKey?'Get access to the game before creating your content.':keylessAccess.description}</p>
    {requiresKey&&joined&&<p>{progress.isError?'Your access could not be loaded. Please retry.':locked?'Your access is governed by your existing participation.':'Reveal your reserved key when you’re ready to start your submission deadline.'}</p>}
    {requiresKey&&restricted&&<p>Keys are available to eligible creator accounts. Developer accounts can preview this page.</p>}
    {revealed?.id===id&&<div className="bounty-access-key"><span>Your game key</span><code>{revealed.key}</code></div>}</div>
    <div className="bounty-access-actions">{!requiresKey?<a className="bounty-detail-start" href={playDestination} target="_blank" rel="noopener noreferrer">{playUrl?"Play game":"View game page"}<span className="sr-only"> (opens in a new tab)</span><ExternalLink size={18} aria-hidden="true"/></a>:!user?<a className="bounty-detail-start" href="/auth">Sign in to claim a key</a>:<button type="button" className="bounty-detail-start" disabled={restricted||locked||join.isPending||reveal.isPending||(joined&&(progress.isPending||progress.isError))||(!joined&&keysLeft<=0)} onClick={()=>joined?reveal.mutate():setConfirm(true)}>{join.isPending||reveal.isPending?<Loader2 size={18} className="animate-spin"/>:<KeyRound size={18}/>} {joined?'Reveal key':keysLeft<=0?'No keys available':'Claim key'}</button>}{progress.isError&&<button type="button" className="bounty-text-action" onClick={()=>progress.refetch()}>Retry access</button>}</div>
    </div>
    <Dialog open={confirm} onOpenChange={setConfirm}><DialogContent className="bg-[#141824] border-[#303448] text-white"><DialogHeader><DialogTitle>Claim game access?</DialogTitle><DialogDescription>You’ll join {active.campaign_title || 'this bounty'} and reserve an access key. Your submission deadline starts when you reveal the key.</DialogDescription></DialogHeader><DialogFooter><button type="button" className="bounty-text-action" onClick={()=>setConfirm(false)}>Not now</button><button type="button" className="bounty-detail-start" disabled={join.isPending} onClick={()=>join.mutate()}>{join.isPending?'Claiming…':'Claim key'}</button></DialogFooter></DialogContent></Dialog>
  </section>;
}

type PublicItem = {
  id: number;
  content_type: 'clip' | 'reel' | 'screenshot';
  media_id: number;
  user_id: number;
  username: string;
  display_name?: string | null;
  title: string;
  media_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  description?: string | null;
  pinned_at?: string | null;
  share_code?: string | null;
  created_at?: string | null;
};

async function homepagePreview<T>(path: string, limit = 1): Promise<T[]> {
  const response = await authedFetch(path, { method: 'GET' });
  if (!response.ok) return [];
  const items = await response.json();
  return Array.isArray(items) ? items.slice(0, limit) : [];
}

async function homepageScreenshotPreview() {
  const candidates = await homepagePreview<any>('/api/screenshots/latest?limit=12', 12);
  // Some older public posts still point to missing files. Pick a working
  // homepage example so local layout previews don't start with a broken card.
  const available = await Promise.all(candidates.map(async screenshot => {
    if (!screenshot.imageUrl) return null;
    const imageUrl = await fetchSignedUrl(screenshot.imageUrl);
    const image = new Image();
    image.src = imageUrl;
    try {
      await image.decode();
      return { ...screenshot, imageUrl };
    } catch {
      return null;
    }
  }));
  const screenshot = available.find(Boolean);
  return screenshot ? [screenshot] : [];
}

export function GameBountyCommunity({ campaign }: { campaign: any }) {
  const id = bountyInstanceId(campaign);
  const { user } = useAuth();
  const { openClipDialog } = useClipDialog();
  const isMobile = useMobile();
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);
  const content = useInfiniteQuery<{ items: PublicItem[]; nextCursor: number | null }>({
    queryKey: ['/api/bounties', id, 'community-content'],
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) => {
      const response = await authedFetch(`/api/bounties/${id}/community-content${pageParam ? `?before=${pageParam}` : ''}`, { method: 'GET' });
      if (!response.ok) throw new Error('Could not load uploaded content');
      return response.json();
    },
    getNextPageParam: page => page.nextCursor ?? undefined,
    staleTime: 30000,
    refetchInterval: 60000,
  });
  const seenMedia = new Set<string>();
  const items = (content.data?.pages.flatMap(page => page.items) ?? []).filter(item => {
    const key = `${item.content_type}:${item.media_id}`;
    if (seenMedia.has(key)) return false;
    seenMedia.add(key);
    return true;
  });
  const { getSignedUrl } = useSignedUrls(items.flatMap(item => [item.media_url, item.thumbnail_url]).filter(Boolean));
  const showSamples = import.meta.env.DEV && content.isSuccess && !items.length;
  const examples = useQuery({
    queryKey: ['bounty-homepage-preview-media'],
    enabled: showSamples,
    staleTime: 60_000,
    queryFn: async () => {
      const [clips, reels, screenshots] = await Promise.all([
        homepagePreview<ClipWithUser>('/api/clips/latest?limit=1'),
        homepagePreview<ClipWithUser>('/api/reels/latest?limit=1'),
        homepageScreenshotPreview(),
      ]);
      return { clips, reels, screenshots };
    },
  });
  const gameName = campaign.catalog_game_name ?? campaign.game_profile_name ?? campaign.game_name;
  const toCard = (item: PublicItem) => ({
    id: item.media_id,
    userId: item.user_id,
    gameId: campaign.game_id,
    user: { id: item.user_id, username: item.username, displayName: item.display_name },
    title: item.title,
    description: item.description,
    videoType: item.content_type,
    videoUrl: getSignedUrl(item.media_url) || item.media_url,
    imageUrl: getSignedUrl(item.media_url) || item.media_url,
    thumbnailUrl: item.thumbnail_url ? getSignedUrl(item.thumbnail_url) || item.thumbnail_url : null,
    duration: item.duration,
    views: item.views,
    shareCode: item.share_code,
    createdAt: item.created_at ? new Date(item.created_at) : undefined,
    pinnedAt: item.pinned_at ? new Date(item.pinned_at) : null,
    game: gameName ? { id: campaign.game_id, name: gameName } : undefined,
  });
  const clips = showSamples ? examples.data?.clips ?? [] : items.filter(item => item.content_type === 'clip').map(item => toCard(item) as unknown as ClipWithUser);
  const reels = showSamples ? examples.data?.reels ?? [] : items.filter(item => item.content_type === 'reel').map(item => toCard(item) as unknown as ClipWithUser);
  const screenshots = showSamples ? examples.data?.screenshots ?? [] : items.filter(item => item.content_type === 'screenshot').map(toCard);
  const hasMedia = clips.length + reels.length + screenshots.length > 0;

  return <section id="bounty-community" className="bounty-page-section" aria-labelledby="bounty-community-title">
    <h2 id="bounty-community-title">Uploaded content</h2>
    <p>{showSamples && hasMedia ? 'Homepage examples for this local preview. No approved bounty submissions yet.' : 'Approved clips, reels and screenshots from creators playing this game.'}</p>
    {content.isPending || (showSamples && examples.isLoading) ? <p role="status">Loading creator content…</p>
      : content.isError ? <p role="alert">Content couldn’t be loaded. <button type="button" className="bounty-text-action" onClick={() => content.refetch()}>Try again</button></p>
      : !hasMedia ? <div className="bounty-empty-content">No approved content yet. Be the first to share something.</div>
      : <div className="bounty-community-grid">
        {clips.map(clip => <div key={`clip-${clip.id}`} className="min-w-0">
          <VideoClipCard clip={clip} clipsList={clips}/>
        </div>)}
        {reels.map(reel => <div key={`reel-${reel.id}`} className="w-full min-w-0 max-w-[250px]">
          <ReelCard
            title={reel.title}
            thumbnailUrl={reel.thumbnailUrl || `/api/clips/${reel.id}/thumbnail`}
            duration={reel.trimEnd && reel.trimEnd > 0 ? reel.trimEnd - (reel.trimStart || 0) : reel.duration || 0}
            views={reel.views ?? 0}
            username={reel.user.username}
            gameName={reel.game?.name}
            gameHref={reel.game?.name ? publicGamePath(reel.game.name) : undefined}
            onOpen={() => openClipDialog(reel.id, reels, undefined, 'reel')}
            actions={<TrendingClipMenu clip={reel} onHide={() => void (showSamples ? examples.refetch() : content.refetch())}/>}
          />
        </div>)}
        {screenshots.map(screenshot => <div key={`screenshot-${screenshot.id}`} className="min-w-0">
          <ScreenshotCard screenshot={screenshot} isOwnProfile={user?.id === screenshot.userId}
            profile={screenshot.user} showUserInfo onSelect={setSelectedScreenshot}/>
        </div>)}
      </div>}
    {content.hasNextPage && <button type="button" className="bounty-text-action" disabled={content.isFetchingNextPage} onClick={() => content.fetchNextPage()}>{content.isFetchingNextPage ? 'Loading…' : 'Load more content'}</button>}
    {selectedScreenshot && isMobile
      ? <MobileScreenshotsViewer screenshots={screenshots} startId={selectedScreenshot.id} onBack={() => setSelectedScreenshot(null)}/>
      : <ScreenshotLightbox screenshot={selectedScreenshot} screenshots={screenshots} currentUserId={user?.id}
          onClose={() => setSelectedScreenshot(null)} onNavigate={setSelectedScreenshot}/>}
  </section>;
}
