import { formatCampaignMoment } from "@/lib/campaign-timeline";

type Moment = string | Date | null | undefined;

function Milestone({ title, at, fallback }: { title: string; at?: Moment; fallback: string }) {
  const moment = formatCampaignMoment(at);
  return <div className="min-w-0 flex-1">
    <div className="text-[10px] font-bold uppercase tracking-[.12em] text-white/50">{title}</div>
    {moment ? <>
      <div className="mt-2 text-base font-black text-white tabular-nums sm:text-lg">{moment.dateLabel}</div>
      <div className="mt-0.5 text-xs font-bold text-white/75 tabular-nums">{moment.timeLabel}</div>
    </> : <div className="mt-2 text-sm font-bold text-white/80">{fallback}</div>}
  </div>;
}

function Window({ startLabel, endLabel, startAt, endAt, startFallback, endFallback, duration }: {
  startLabel: string; endLabel: string; startAt?: Moment; endAt?: Moment;
  startFallback: string; endFallback: string; duration: string;
}) {
  return <div>
    <div className="flex gap-4 sm:gap-8">
      <Milestone title={startLabel} at={startAt} fallback={startFallback} />
      <Milestone title={endLabel} at={endAt} fallback={endFallback} />
    </div>
    <div className="mt-4 flex items-center gap-2 text-[#B9FF1A]" aria-hidden="true">
      <span className="h-2 w-2 shrink-0 rounded-full border border-current" />
      <span className="h-px flex-1 bg-current" />
      <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
    </div>
    <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-[.14em] text-white/55">{duration}</div>
  </div>;
}

export function CampaignTimeline({ launchAt, closesAt, launchFallback = "After approval",
  openDays, creatorDays, joinedAt, dueAt, creatorOnly = false }: {
  launchAt?: Moment; closesAt?: Moment; launchFallback?: string;
  openDays?: number; creatorDays?: number; joinedAt?: Moment; dueAt?: Moment; creatorOnly?: boolean;
}) {
  return <section aria-label="Campaign timeline" className="rounded-xl border border-white/[.08] bg-[#10151d] p-4 sm:p-5">
    <h3 className="mb-5 text-[10px] font-bold uppercase tracking-[.15em] text-white/55">Campaign timeline</h3>
    {!creatorOnly && openDays != null && <Window
      startLabel="Campaign launch" endLabel="Campaign closes"
      startAt={launchAt} endAt={closesAt}
      startFallback={launchFallback} endFallback={`${openDays} days after launch`}
      duration={`${openDays} days open`} />}
    {creatorDays != null && <div className={!creatorOnly && openDays != null ? "mt-5 border-t border-white/[.07] pt-5" : ""}>
      <Window startLabel={joinedAt ? "Creator joined" : "Creator joins"}
        endLabel="Submission due" startAt={joinedAt} endAt={dueAt}
        startFallback="Whenever they join" endFallback={`${creatorDays} days after joining`}
        duration={`${creatorDays} days to complete`} />
    </div>}
  </section>;
}