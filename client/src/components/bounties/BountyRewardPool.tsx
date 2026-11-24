import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, ChevronDown, LockKeyhole, Pause, Play } from "lucide-react";
import type { BountyRewardPoolData, BountyRewardShare } from "@shared/bounty-reward-pool";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";
import { authedFetch } from "@/lib/queryClient";
import { isNative } from "@/lib/platform";
import { SeasonRewardPool } from "@/components/campaign/SeasonRewardPool";
import "./bounty-reward-pool.css";

const xpArt = "/attached_assets/XP-text_1779960376768.png";
const number = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 6 });
const percent = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 });
const month = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });
const endDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
const historyDate = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const panel = "rounded-2xl border border-[#303448] bg-[#171927]";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#B7FF18] px-5 font-bold text-[#0F101B] hover:bg-[#CBFF55]";
const value = "font-bold tabular-nums text-[#B7FF18]";
const poolUrl = "/api/bounties/reward-pool";

function PoolCountdown({ start, end }: { start: string; end: string }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  const remaining = Math.max(0, endMs - now);
  const elapsed = Math.min(100, Math.max(0, 100 * (now - startMs) / (endMs - startMs)));
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor(remaining % 86_400_000 / 3_600_000);
  const left = days > 0 ? `${days}d ${hours}h left` : hours > 0 ? `${hours}h left` : remaining > 0 ? "Less than an hour left" : "Period ended";
  return (
    <div className="mt-7 max-w-xl">
      <div className="flex flex-wrap justify-between gap-2 text-sm text-[#D2D7E4]">
        <span className="flex items-center gap-2"><CalendarDays size={17} aria-hidden="true" />Ends {endDate.format(endMs - 1)}</span>
        <span className={value}>{left}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#353A4D]"
        role="progressbar" aria-label="Reward period elapsed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(elapsed)}>
        <div className="h-full rounded-full bg-[#B7FF18] motion-safe:transition-[width]" style={{ width: `${elapsed}%` }} />
      </div>
    </div>
  );
}

function ScoreBreakdown({ score }: { score: BountyRewardShare }) {
  return (
    <dl className="grid gap-2 text-sm text-[#D2D7E4] sm:grid-cols-2 lg:grid-cols-4">
      <div> <dt>Base score</dt><dd className="font-bold text-white">{number.format(score.base)}</dd></div>
      <div> <dt>Season bonus</dt><dd className="font-bold text-white">+{number.format(score.seasonBonus)}</dd></div>
      <div> <dt>Level bonus</dt><dd className="font-bold text-white">+{number.format(score.levelBonus)}</dd></div>
      <div> <dt>Final Reward Score</dt><dd className={value}>{number.format(score.total)}</dd></div>
    </dl>
  );
}

function ShareSummary({ personal, onExplore }: { personal: BountyRewardShare | null; onExplore: () => void }) {
  return (
    <section aria-labelledby="your-bounty-share" className={`${panel} p-5 sm:p-7`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="your-bounty-share" className="text-2xl font-bold">Your share</h2>
        {personal && <span className={`rounded-full border border-[#3A4256] px-3 py-1 text-sm font-semibold ${personal.total ? "text-[#B7FF18]" : "text-[#D2D7E4]"}`}>{personal.status}</span>}
      </div>
      {personal?.total ? (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-5 lg:grid-cols-4">
            <div><dt className="text-sm text-[#D2D7E4]">Current Reward Score</dt><dd className={`text-3xl ${value}`}>{number.format(personal.total)}</dd></div>
            <div><dt className="text-sm text-[#D2D7E4]">Approved bounties</dt><dd className="text-3xl font-bold">{number.format(personal.approved)}</dd></div>
            <div><dt className="text-sm text-[#D2D7E4]">Estimated share</dt><dd className={`text-3xl ${value}`}>{percent.format(personal.share)}</dd></div>
            <div><dt className="text-sm text-[#D2D7E4]">Submissions awaiting approval</dt><dd className="text-3xl font-bold">{number.format(personal.awaiting)}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-[#D2D7E4]">Your final share may change as more creators complete bounties.</p>
          <div className="mt-5 border-t border-[#303448] pt-4"><ScoreBreakdown score={personal} /></div>
        </>
      ) : (
        <div className="mt-5">
          <h3 className="text-lg font-bold">Complete a bounty to join the pool</h3>
          <p className="mt-2 text-[#D2D7E4]">Once your first bounty is approved, you will automatically be added to the current Reward Pool.</p>
          {!!personal?.awaiting && <p className="mt-3 font-semibold">{number.format(personal.awaiting)} {personal.awaiting === 1 ? "submission" : "submissions"} awaiting approval</p>}
          <button type="button" onClick={onExplore} className={`mt-5 ${button}`}>Explore Bounties <ArrowRight size={17} aria-hidden="true" /></button>
        </div>
      )}
    </section>
  );
}

const steps = [
  { icon: "/assets/reward-pool/choose-bounty-flat.webp", title: "Choose a bounty", description: "Pick a participating indie game and complete one of its bounties." },
  { icon: "/assets/reward-pool/get-approved-flat.webp", title: "Get your work approved", description: "Submit your work. Once it’s approved, it adds to your Reward Score." },
  { icon: "/assets/reward-pool/earn-rewards-flat.webp", title: "Earn a share of the pool", description: "When the period closes, your final score determines your share of the rewards." },
];

export function BountyRewardPool({ userId, onExplore, children }: { userId?: number; onExplore: () => void; children: ReactNode }) {
  const [animationPaused, setAnimationPaused] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const { data, isPending, refetch } = useQuery<BountyRewardPoolData>({
    queryKey: [poolUrl, userId ?? null],
    queryFn: async ({ signal }) => {
      const response = await authedFetch(poolUrl, { signal });
      if (!response.ok) throw new Error("Couldn’t load the Reward Pool.");
      return response.json();
    },
    refetchOnWindowFocus: true,
    refetchInterval: isLive ? 60_000 : 10_000,
  });

  const hasSnapshot = data != null;
  useEffect(() => {
    if (isNative || userId == null || !hasSnapshot || typeof EventSource === "undefined") return;
    const events = new EventSource(`${poolUrl}/events`);
    const refresh = () => void refetch();
    const markStale = () => setIsLive(false);
    events.onerror = markStale;
    events.addEventListener("rewards-stale", markStale);
    events.addEventListener("rewards-ready", () => { setIsLive(true); refresh(); });
    events.addEventListener("rewards-changed", refresh);
    return () => {
      events.close();
      setIsLive(false);
    };
  }, [userId, hasSnapshot, refetch]);

  if (isPending) return <p role="status" className="py-10 text-center text-[#D2D7E4]">Loading Reward Pool…</p>;
  if (!data) return (
    <div role="alert" className="py-10 text-center">
      <p>Couldn’t load the Reward Pool.</p>
      <button type="button" className={`mt-4 ${button}`} onClick={() => void refetch()}>Try again</button>
    </div>
  );

  const { current, personal, previous, closing } = data;
  return (
    <div className="text-white">
      <section aria-labelledby="reward-pool-title" data-paused={animationPaused} className="reward-pool-hero relative isolate w-full overflow-hidden">
        <div aria-hidden="true" className="reward-pool-visual pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="reward-pool-collage">
            <img src="/banners/bounty-reward-pool-character.webp" alt="" className="block h-full w-full" />
            <img src={xpArt} alt="" className="reward-pool-float reward-pool-float--xp" />
            <img src={gfTokenLogo} alt="" className="reward-pool-float reward-pool-float--gft" />
          </div>
          <div className="reward-pool-shade absolute inset-0" />
        </div>
        <div className="mx-auto w-full max-w-[1680px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="md:max-w-[55%]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-sm font-bold tracking-widest text-[#B7FF18]">CURRENT REWARD POOL</p>
              {isLive && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E3E7EF]"><span className="size-1.5 rounded-full bg-[#B7FF18]" aria-hidden="true" />Live totals</span>}
            </div>
            <h1 id="reward-pool-title" className="mt-3 max-w-xl text-3xl font-bold leading-[1.08] sm:text-5xl xl:text-6xl">Complete bounties. Share the rewards.</h1>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-[#E3E7EF] sm:text-lg">Every approved bounty increases your share of the current Reward Pool.</p>
            <p className="mt-6 text-xl font-bold">{month.format(Date.parse(current.start))} Reward Pool</p>
            <PoolCountdown key={current.id} start={current.start} end={current.end} />
          </div>
        </div>
        <button type="button" aria-label={animationPaused ? "Play pool animation" : "Pause pool animation"}
          onClick={() => setAnimationPaused(paused => !paused)}
          className="absolute bottom-4 right-4 grid size-11 place-items-center rounded-lg border border-[#53603E] bg-[#111621] text-white hover:border-[#B7FF18] focus-visible:outline focus-visible:outline-[#B7FF18] motion-reduce:hidden">
          {animationPaused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
        </button>
      </section>

      <div className="mx-auto max-w-[1680px] space-y-9 px-4 py-8 sm:space-y-12 sm:px-6 lg:px-8">
      <section aria-label="Pool contents" aria-live="polite" className="grid gap-6 sm:grid-cols-3 sm:gap-8">
        <article className="min-w-0 border-b border-white/10 pb-5 sm:border-b-0 sm:pb-0">
          <img src={xpArt} alt="" className="h-12 w-16 object-contain object-left" />
          <p className={`mt-4 text-3xl lg:text-4xl ${value}`}>{number.format(current.xp)} XP</p>
          <h2 className="mt-2 text-sm font-bold tracking-wide">BOUNTY XP POOL</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#D2D7E4]">Shared between eligible creators when the reward period ends.</p>
        </article>
        <article className="min-w-0 border-b border-white/10 pb-5 sm:border-b-0 sm:border-l sm:pb-0 sm:pl-6">
          <img src={gfTokenLogo} alt="" className="size-12 object-contain" />
          <p className={`mt-4 text-3xl lg:text-4xl ${value}`}>{number.format(current.gft)} GFT</p>
          <h2 className="mt-2 text-sm font-bold tracking-wide">GFT REWARD POOL</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#D2D7E4]">Distributed according to each creator’s final Reward Score.</p>
        </article>
        <article className="min-w-0 sm:border-l sm:border-white/10 sm:pl-6">
          <span className="flex size-12 items-center text-[#B7FF18]"><LockKeyhole size={32} aria-hidden="true" /></span>
          <p className="mt-4 text-3xl font-bold lg:text-4xl">???</p>
          <h2 className="mt-2 text-sm font-bold tracking-wide">MYSTERY REWARD</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#D2D7E4]">{current.hasMysteryReward ? "Revealed when this reward period closes." : "Coming soon."}</p>
        </article>
      </section>

      {children}

      <ShareSummary personal={personal} onExplore={onExplore} />

      {userId != null && (
        <details className={`${panel} p-5 sm:p-7`}>
          <summary className="cursor-pointer text-lg font-bold text-[#B7FF18]">Your season rewards</summary>
          <div className="mt-4"><SeasonRewardPool /></div>
        </details>
      )}

      <section aria-labelledby="bounty-pool-steps" className="reward-pool-guide py-4">
        <h2 id="bounty-pool-steps" className="text-2xl font-bold">How it works</h2>
        <ol className="reward-pool-steps mt-8">
          {steps.map(({ icon, title, description }, index) => (
            <li key={title} className="reward-pool-step text-center">
              <img src={icon} alt="" width={384} height={384} loading="lazy" className="reward-pool-step-icon" />
              <h3 className="mt-4 text-lg font-bold">{index + 1}. {title}</h3>
              <p className="mx-auto mt-2 max-w-[28ch] text-sm leading-relaxed text-[#D2D7E4]">{description}</p>
            </li>
          ))}
        </ol>
        <details className="group mt-8">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-[#B7FF18] [&::-webkit-details-marker]:hidden">
            How rewards are calculated <ChevronDown size={17} aria-hidden="true" className="group-open:rotate-180" />
          </summary>
          <div className="mt-3 max-w-3xl space-y-2 text-sm leading-relaxed text-[#D2D7E4]">
            <p>Your share is based on approved bounty work, not views, likes or follower numbers. Fixed rewards shown on individual bounties are separate from the pool.</p>
            <p>Approved required deliverables earn points based on workload. Verified streams earn 100 points for each required 30-minute block. Repeated submissions earn no extra points.</p>
            <p>Account level and seasonal placement for approved bounty work can each add up to 5% of your base score. The combined bonus is capped at 10%.</p>
            <p>Your final share is your Reward Score divided by the total Reward Score of all eligible creators. We resolve submissions already awaiting approval before locking the scores.</p>
          </div>
        </details>
      </section>

      <section aria-labelledby="previous-bounty-pools" className="border-t border-[#303448] pt-7">
        <h2 id="previous-bounty-pools" className="text-2xl font-bold">Previous Reward Pools</h2>
        <div className="mt-5 space-y-3">
          {closing.filter(period => !previous.some(item => item.id === period.id)).map(period => (
            <div key={period.id} className={`${panel} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
              <span className="font-semibold">{historyDate.format(Date.parse(period.start))}</span>
              <span className="text-sm text-[#D2D7E4]">{period.status}</span>
            </div>
          ))}
          {previous.map(period => (
            <details key={period.id} className={`group ${panel} px-5 py-4`}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span className="font-semibold">{historyDate.format(Date.parse(period.start))}</span>
                <span className="flex items-center gap-2 text-sm text-[#D2D7E4]">
                  {number.format(period.xp)} XP · {number.format(period.gft)} GFT distributed
                  <ChevronDown size={17} aria-hidden="true" className="group-open:rotate-180" />
                </span>
              </summary>
              <div className="mt-4 space-y-3 border-t border-[#303448] pt-4 text-sm text-[#D2D7E4]">
                <p>{number.format(period.eligibleCreators)} eligible {period.eligibleCreators === 1 ? "creator" : "creators"} · {number.format(period.totalScore)} total Reward Score</p>
                {period.mystery && <p>Mystery reward revealed · <strong className="text-white">{period.mystery}</strong></p>}
                {period.personal && (
                  <>
                    <p className="font-semibold text-white">Your final share · {percent.format(period.personal.share)} · {number.format(period.personal.xp)} XP · {number.format(period.personal.gft)} GFT</p>
                    <p className={value}>{period.personal.status}</p>
                    {period.personal.mystery && <p>Your mystery reward · {period.personal.mystery}</p>}
                    <ScoreBreakdown score={period.personal} />
                  </>
                )}
              </div>
            </details>
          ))}
          {!previous.length && !closing.length && <p className="text-[#D2D7E4]">Completed pools will appear here after the first reward period closes.</p>}
        </div>
      </section>
      </div>
    </div>
  );
}
