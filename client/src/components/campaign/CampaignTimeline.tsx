import { formatCampaignMoment } from "@/lib/campaign-timeline";

type Moment = string | Date | null | undefined;

function MomentDetails({ at, fallback }: { at?: Moment; fallback: string }) {
  const moment = formatCampaignMoment(at);
  return moment ? (
    <span className="block tabular-nums">
      <span className="block text-[14px] font-bold text-white sm:text-[15px]">{moment.dateLabel}</span>
      <span className="block text-xs font-medium text-white/65">{moment.timeLabel}</span>
    </span>
  ) : <span className="block text-[13px] font-semibold leading-snug text-white/75">{fallback}</span>;
}

function Window({ heading, description, startLabel, endLabel, startAt, endAt, startFallback, endFallback, duration }: {
  heading: string; description: string; startLabel: string; endLabel: string;
  startAt?: Moment; endAt?: Moment; startFallback: string; endFallback: string; duration: string;
}) {
  const moments = [
    { label: startLabel, at: startAt, fallback: startFallback },
    { label: endLabel, at: endAt, fallback: endFallback },
  ];

  return <div>
    <div className="mb-3">
      <h4 className="text-[11px] font-extrabold uppercase tracking-[.12em] text-white">{heading}</h4>
      <p className="mt-0.5 text-[11px] leading-snug text-white/45">{description}</p>
    </div>

    {/* Desktop: nodes mark moments; the muted connector and its caption mark elapsed time. */}
    <div className="hidden sm:block">
      <div className="flex items-center gap-2">
        <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#B9FF1A]" aria-hidden="true" />
        <span className="h-px min-w-0 flex-1 bg-white/20" aria-hidden="true" />
        <span className="shrink-0 px-2 text-center text-[10px] font-extrabold uppercase tracking-[.12em] text-[#B9FF1A]">{duration}</span>
        <span className="h-px min-w-0 flex-1 bg-white/20" aria-hidden="true" />
        <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#B9FF1A]" aria-hidden="true" />
      </div>
      <ol className="mt-2 flex justify-between gap-4">
        {moments.map(({ label, at, fallback }, index) =>
          <li key={label} className={`min-w-0 max-w-[48%] ${index === 1 ? "text-right" : ""}`}>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[.08em] text-white/80">{label}</div>
            <MomentDetails at={at} fallback={fallback} />
          </li>
        )}
      </ol>
    </div>

    {/* Mobile: the duration sits inside the vertical path, not below a compressed bar. */}
    <div className="sm:hidden">
      <div>
        <div className="grid grid-cols-[8px_1fr] gap-x-3">
          <span className="mt-1 h-[7px] w-[7px] rounded-full bg-[#B9FF1A]" aria-hidden="true" />
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[.08em] text-white/80">{startLabel}</div>
            <MomentDetails at={startAt} fallback={startFallback} />
          </div>
        </div>
        <div className="grid grid-cols-[8px_1fr] gap-x-3">
          <span className="ml-[3px] my-1 w-px bg-white/20" aria-hidden="true" />
          <span className="py-3 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#B9FF1A]">{duration}</span>
        </div>
        <div className="grid grid-cols-[8px_1fr] gap-x-3">
          <span className="mt-1 h-[7px] w-[7px] rounded-full bg-[#B9FF1A]" aria-hidden="true" />
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[.08em] text-white/80">{endLabel}</div>
            <MomentDetails at={endAt} fallback={endFallback} />
          </div>
        </div>
      </div>
    </div>
  </div>;
}

export function CampaignTimeline({ launchAt, closesAt, launchFallback = "After approval",
  openDays, creatorDays, joinedAt, dueAt, creatorOnly = false }: {
  launchAt?: Moment; closesAt?: Moment; launchFallback?: string;
  openDays?: number; creatorDays?: number; joinedAt?: Moment; dueAt?: Moment; creatorOnly?: boolean;
}) {
  const hasCampaignWindow = !creatorOnly && openDays != null;
  return <section aria-label="Campaign timeline" className="border-b border-white/[.09] pb-5">
    <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[.15em] text-white/55">Campaign timeline</h3>
    {hasCampaignWindow && <Window
      heading="Open for creators" description="New creators can join until the campaign closes."
      startLabel="Campaign launch" endLabel="Campaign closes"
      startAt={launchAt} endAt={closesAt}
      startFallback={launchFallback} endFallback={`${openDays} days after launch`}
      duration={`Open for ${openDays} days`} />}
    {creatorDays != null && <div className={hasCampaignWindow ? "mt-5 border-t border-white/[.07] pt-4 sm:ml-[12%]" : ""}>
      <Window heading="Each creator's completion window"
        description="Their own deadline starts when they accept or reveal access, even if the campaign closes to new creators."
        startLabel={joinedAt ? "Creator joined" : "Creator joins"}
        endLabel="Submission due" startAt={joinedAt} endAt={dueAt}
        startFallback="When they accept" endFallback={`${creatorDays} days after joining`}
        duration={`${creatorDays} days to complete`} />
    </div>}
  </section>;
}
