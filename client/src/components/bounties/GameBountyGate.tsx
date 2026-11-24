import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ExternalLink, Gamepad2, KeyRound, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthModal } from '@/hooks/use-auth-modal';
import { authedFetch } from '@/lib/queryClient';
import { publicGamePath } from '@/lib/game-routes';
import { bountyInstanceId } from '@shared/bounty-game-groups';
import { isRegularBounty } from '@shared/bounty-submission-policy';
import { bountyKeylessAccessCopy, bountyPlayUrl } from './GameBountySections';

export function bountyNeedsKey(campaign: any) {
  return Boolean(campaign?.requires_access_key) || ['demo_key', 'demo', 'demo_to_full', 'private_playtest', 'full_game_upfront', 'full_upfront'].includes(campaign?.access_method);
}

export function GameBountyGate({ gameId, viewerId, campaign, previewKeyClaim = false, children }: {
  gameId: number;
  viewerId?: number;
  campaign?: any;
  previewKeyClaim?: boolean;
  children: (locked: boolean) => ReactNode;
}) {
  const { openModal } = useAuthModal();
  const queryClient = useQueryClient();
  const storageKey = `gamefolio:bounty-play:${viewerId ?? 'guest'}:${gameId}`;
  const [played, setPlayed] = useState(() => {
    try { return sessionStorage.getItem(storageKey) === '1'; } catch { return false; }
  });
  const [claim, setClaim] = useState<{ scope: string; key: string } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);
  const keyIcon = useRef<HTMLSpanElement>(null);
  const flyingKey = useRef<HTMLSpanElement>(null);
  const focusHeading = () => requestAnimationFrame(() => document.getElementById('game-bounties-heading')?.focus());
  const needsKey = bountyNeedsKey(campaign);
  const accessScope = isRegularBounty(campaign) ? campaign.access_method : String(bountyInstanceId(campaign));
  const claimedKey = claim?.scope === accessScope ? claim?.key : undefined;
  const locked = Boolean(campaign) && (needsKey ? claiming || (!claimedKey && !campaign.has_game_access && !campaign.access_revealed_at) : !played);
  const playUrl = campaign && bountyPlayUrl(campaign);
  const gameName = campaign?.catalog_game_name ?? campaign?.game_profile_name ?? campaign?.game_name;
  const playDestination = playUrl ?? (gameName ? publicGamePath(gameName) : null);
  const keylessAccess = bountyKeylessAccessCopy(campaign?.access_method, Boolean(playUrl));
  const fullGameKey = ['full_game_upfront', 'full_upfront'].includes(campaign?.access_method);
  const remainingKeys = fullGameKey ? campaign.full_access_keys_remaining : campaign?.demo_keys_remaining;
  const parsedKeyCount = Number(remainingKeys);
  const keyCount = remainingKeys != null && Number.isSafeInteger(parsedKeyCount) && parsedKeyCount >= 0 ? parsedKeyCount : null;
  const keyUnavailable = needsKey && !campaign.participant_status && keyCount === 0;
  const actionClass = 'flex min-h-16 w-full items-center gap-4 rounded-lg bg-[#B9FF1A] px-5 py-3 text-left text-xl font-bold text-[#10130A] transition-colors hover:bg-[#CBFF59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B9FF1A] sm:px-7 sm:text-2xl';

  function playGame() {
    try { sessionStorage.setItem(storageKey, '1'); } catch {}
    setPlayed(true);
    focusHeading();
  }

  async function animateKey() {
    const avatar = document.querySelector<HTMLElement>('[data-bounty-key-avatar]');
    if (!avatar || !keyIcon.current || !flyingKey.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const origin = keyIcon.current.getBoundingClientRect();
    const target = avatar.getBoundingClientRect();
    if (!target.width || target.bottom < 0 || target.top > window.innerHeight) return;
    const key = flyingKey.current;
    const from = `translate(${origin.x + origin.width / 2 - 17}px, ${origin.y + origin.height / 2 - 17}px)`;
    const to = `translate(${target.x + target.width / 2 - 17}px, ${target.y + target.height / 2 - 17}px)`;
    await key.animate([
      { transform: `${from} scale(1)`, opacity: 1 },
      { transform: `${to} scale(.5)`, opacity: 1 },
    ], { duration: 520, easing: 'cubic-bezier(.35,0,.25,1)' }).finished;
    avatar.animate([
      { boxShadow: '0 0 0 3px #B9FF1A, 0 0 16px #B9FF1A' },
      { boxShadow: '0 0 0 5px transparent, 0 0 4px transparent' },
    ], { duration: 850, easing: 'ease-out' });
  }

  async function claimKey() {
    if (!viewerId) { openModal(); return; }
    setClaiming(true);
    setError('');
    setPendingApproval(false);
    try {
      if (import.meta.env.DEV && previewKeyClaim) {
        setClaim({ scope: accessScope, key: 'LOCAL-TEST-KEY' });
        await animateKey().catch(() => {});
        focusHeading();
        return;
      }
      const id = bountyInstanceId(campaign);
      if (!campaign.participant_status) {
        const join = await authedFetch(`/api/bounties/${id}/join`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claimGameKey: true }),
        });
        const result = await join.json();
        if (join.status === 202) { setPendingApproval(true); return; }
        if (!join.ok && !(join.status === 409 && result.participantId)) throw new Error(result.error || 'Could not claim a game key.');
      }
      const reveal = await authedFetch(`/api/bounties/${id}/reveal-access-key`, { method: 'POST' });
      const result = await reveal.json();
      if (!reveal.ok || !result.key) throw new Error(result.error || 'Could not retrieve your game key.');
      setClaim({ scope: accessScope, key: result.key });
      await animateKey().catch(() => {});
      focusHeading();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not claim a game key. Please try again.');
    } finally {
      setClaiming(false);
      if (!previewKeyClaim) {
        void queryClient.invalidateQueries({ queryKey: ['/api/bounties'] });
        void queryClient.invalidateQueries({ queryKey: ['/api/bounties/my/campaigns'] });
      }
    }
  }

  return <div className={locked ? 'relative isolate grid min-h-[290px] overflow-hidden rounded-xl' : undefined}>
    {!locked && claimedKey && <details className="mb-4 rounded-lg border border-white/15 px-4 py-3" open>
      <summary className="cursor-pointer font-semibold text-[#B9FF1A]">{previewKeyClaim ? 'Test key claimed' : 'Game key added to your account'}</summary>
      <code className="mt-2 block select-all break-all">{claimedKey}</code>
    </details>}
    <div ref={element => { if (element) element.inert = locked; }} aria-hidden={locked || undefined}
      className={locked ? 'pointer-events-none col-start-1 row-start-1 select-none blur-lg opacity-50' : undefined}>
      {children(locked)}
    </div>
    {locked && <div className="z-10 col-start-1 row-start-1 rounded-xl bg-black/55">
      <div className="grid h-full max-h-[28rem] min-h-[290px] place-items-center p-5">
        <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#141824] p-5 sm:p-7"
          role="region" aria-label="Game access">
          {needsKey ? (
            <>
              <h3 className="text-xl font-bold leading-tight text-white sm:text-2xl">Claim a game key</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">This game is offering keys to creators taking part in bounties.</p>
              <div className="my-5 border-y border-white/15 py-3">
                <p className="font-bold text-[#B9FF1A]" aria-live="polite">
                  {keyCount === null ? 'Couldn’t check key availability' : `${keyCount.toLocaleString()} ${keyCount === 1 ? 'key' : 'keys'} available`}
                </p>
                <p className="mt-1 text-sm text-white/75">Keys are limited to one per user.</p>
              </div>
              {pendingApproval && <p className="mb-4 text-sm text-white" role="status">Your application is awaiting approval. You can claim your key once it’s approved.</p>}
              {error && <p className="mb-4 text-sm text-red-300" role="alert">{error}</p>}
              <button type="button" className={actionClass} disabled={claiming || keyUnavailable} onClick={() => void claimKey()}>
                <span ref={keyIcon} className="shrink-0">
                  {claiming ? <Loader2 size={28} className="motion-safe:animate-spin" aria-hidden="true" /> : <KeyRound size={28} aria-hidden="true" />}
                </span>
                <span className="flex-1">{claiming ? 'Claiming key…' : keyUnavailable ? 'No keys available' : 'Claim key'}</span>
                {!claiming && !keyUnavailable && <ArrowRight size={24} aria-hidden="true" />}
              </button>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold leading-tight text-white sm:text-2xl">{keylessAccess.title}</h3>
              <p className="mb-5 mt-2 text-sm leading-relaxed text-white/80">
                {playDestination ? keylessAccess.description : 'No game key needed. You can browse the available bounties below.'}
              </p>
              {playDestination ? (
                <a className={actionClass} href={playDestination} target="_blank" rel="noopener noreferrer" onClick={playGame}>
                  <Gamepad2 size={28} aria-hidden="true" />
                  <span className="flex-1">{playUrl ? 'Play game' : 'View game page'}<span className="sr-only"> (opens in a new tab)</span></span>
                  <ExternalLink size={24} aria-hidden="true" />
                </a>
              ) : (
                <button type="button" className={actionClass} onClick={playGame}>
                  <span className="flex-1">View bounties</span><ArrowRight size={24} aria-hidden="true" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>}
    {locked && needsKey && createPortal(<span ref={flyingKey} aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[200010] grid size-[34px] place-items-center rounded-full bg-[#B9FF1A] text-black opacity-0">
      <KeyRound size={21} />
    </span>, document.body)}
  </div>;
}
