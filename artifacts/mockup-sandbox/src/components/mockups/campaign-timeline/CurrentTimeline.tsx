import "../campaign-personalise/_group.css";

function Milestone({ title, date, time, fallback }: { title: string; date?: string; time?: string; fallback: string }) {
  return <div className="min-w-0 flex-1">
    <div className="text-[10px] font-bold uppercase tracking-[.12em] text-white/50">{title}</div>
    {date ? <>
      <div className="mt-2 text-base font-black text-white tabular-nums sm:text-lg">{date}</div>
      <div className="mt-0.5 text-xs font-bold text-white/75 tabular-nums">{time}</div>
    </> : <div className="mt-2 text-sm font-bold text-white/80">{fallback}</div>}
  </div>;
}

function Window({ startLabel, endLabel, startDate, endDate, startTime, endTime, startFallback, endFallback, duration }: {
  startLabel: string; endLabel: string; startDate?: string; endDate?: string; startTime?: string; endTime?: string;
  startFallback: string; endFallback: string; duration: string;
}) {
  return <div>
    <div className="flex gap-4 sm:gap-8">
      <Milestone title={startLabel} date={startDate} time={startTime} fallback={startFallback} />
      <Milestone title={endLabel} date={endDate} time={endTime} fallback={endFallback} />
    </div>
    <div className="mt-4 flex items-center gap-2 text-[#B9FF1A]" aria-hidden="true">
      <span className="h-2 w-2 shrink-0 rounded-full border border-current" />
      <span className="h-px flex-1 bg-current" />
      <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
    </div>
    <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-[.14em] text-white/55">{duration}</div>
  </div>;
}

export function CurrentTimeline() {
  return <main className="campaign-personalise-preview min-h-screen p-6 sm:p-10">
    <p className="mb-5 text-[11px] font-bold uppercase tracking-[.15em] text-white/50">Personalise your campaign</p>
    <section aria-label="Campaign timeline" className="rounded-xl border border-white/[.08] bg-[#10151d] p-4 sm:p-5">
      <h3 className="mb-5 text-[10px] font-bold uppercase tracking-[.15em] text-white/55">Campaign timeline</h3>
      <Window startLabel="Campaign launch" endLabel="Campaign closes"
        startFallback="After approval" endFallback="30 days after launch" duration="30 days open" />
      <div className="mt-5 border-t border-white/[.07] pt-5">
        <Window startLabel="Creator joins" endLabel="Submission due"
          startFallback="Whenever they join" endFallback="14 days after joining" duration="14 days to complete" />
      </div>
    </section>
  </main>;
}