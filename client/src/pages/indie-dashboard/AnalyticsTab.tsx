import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BarChart3, ExternalLink, Eye, Film, Loader2, MousePointerClick, Users } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { NEON, CARD_BORDER, DASHBOARD_THEME } from "./constants";

type Range = "7d" | "30d" | "90d" | "all";
type Metric = { value: number; changePct: number | null; scope?: string };
type ContentRow = {
  id: number | string;
  title?: string;
  name?: string;
  type?: "clip" | "reel" | "screenshot";
  contentType?: "clip" | "reel" | "screenshot";
  views?: number;
  viewCount?: number;
  thumbnailUrl?: string | null;
  creator?: { username: string; avatarUrl?: string | null };
  verified?: boolean;
  reactions?: number;
};

interface AnalyticsData {
  metrics?: { pageViews: Metric; uniqueVisitors: Metric; contentViews: Metric; storeClicks: Metric };
  discovery?: {
    series: Array<{ date: string; label?: string; pageViews: number; uniqueVisitors: number; storeClicks: number }>;
    sourcesAvailable: boolean;
    sources: Array<{ label?: string; name?: string; value?: number; visits?: number; clicks?: number }>;
  };
  content?: { clips: number; reels: number; screenshots: number; totalContentViews: number; scope?: string };
  topContent?: ContentRow[];
  stores?: { connected: Array<{ key: string; label: string; url: string; clicks: number }>; totalClicks: number; ctr?: number | null };
  engagement?: Array<{ label?: string; name?: string; value?: number; views?: number; watchTime?: number; engagementRate?: number | null }>;
  topCreators?: Array<{ id: number | string; username: string; avatarUrl?: string | null; verified?: boolean; views?: number; totalViews?: number; contentCount?: number; reactions?: number }>;
  insight?: string | null;
  game?: { id: number; name: string };
  // Older deployments can return these while the analytics API is rolling out.
  clipsGenerated?: number;
  screenshotsGenerated?: number;
  reelsGenerated?: number;
}

const cardStyle = { background: "#11161b", border: `1px solid ${CARD_BORDER}` };
const number = (value?: number | null) => value == null ? "—" : value.toLocaleString();

function MetricCard({ label, metric, icon: Icon }: { label: string; metric?: Metric; icon: typeof Eye }) {
  return <div className="rounded-md p-4" style={cardStyle}>
    <div className="flex items-start justify-between gap-2">
      <Icon className="w-4 h-4 mt-0.5" style={{ color: NEON }} />
      {metric?.changePct != null && <span className="text-[11px] font-semibold" style={{ color: metric.changePct >= 0 ? NEON : DASHBOARD_THEME.danger }}>
        {metric.changePct >= 0 ? "+" : ""}{metric.changePct}%</span>}
    </div>
    <div className="mt-3 text-2xl font-bold text-white">{number(metric?.value)}</div>
    <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: DASHBOARD_THEME.textSubtle }}>{label}</div>
    {metric?.scope && <div className="mt-1 text-[10px]" style={{ color: DASHBOARD_THEME.textMuted }}>{metric.scope}</div>}
  </div>;
}

function contentPath(row: ContentRow) {
  const type = row.type ?? row.contentType;
  return type === "reel" ? `/reels/${row.id}` : type === "screenshot" ? `/view/screenshot/${row.id}` : `/clips/${row.id}`;
}

export default function AnalyticsTab({ gameId }: { gameId?: number }) {
  const [range, setRange] = useState<Range>("30d");
  const [chartMetric, setChartMetric] = useState<"pageViews" | "uniqueVisitors" | "storeClicks">("pageViews");
  const { data, isLoading, isError } = useQuery<AnalyticsData>({
    queryKey: ["/api/indie/analytics", gameId, range],
    queryFn: async () => {
      const query = new URLSearchParams({ range });
      if (gameId != null) query.set("gameId", String(gameId));
      const response = await fetch(`/api/indie/analytics?${query}`, { credentials: "include" });
      if (!response.ok) throw new Error("Unable to load analytics");
      return response.json();
    },
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} /></div>;
  if (isError) return <div className="rounded-md p-6 text-sm" style={{ ...cardStyle, color: DASHBOARD_THEME.textMuted }}>Analytics are unavailable right now.</div>;

  const metrics = data?.metrics;
  const discovery = data?.discovery;
  const content = data?.content;
  const series = discovery?.series ?? [];
  const sourceRows = discovery?.sources ?? [];
  const storeRows = data?.stores?.connected ?? [];
  const topContent = (data?.topContent ?? []).slice(0, 5);
  const creators = data?.topCreators ?? [];
  const engagement = data?.engagement ?? [];

  return <div className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-bold text-white">Analytics</h2>
        <p className="mt-1 text-sm" style={{ color: DASHBOARD_THEME.textMuted }}>See how players are discovering and engaging with {data?.game?.name ?? "your game"}.</p>
      </div>
      <div className="flex self-start rounded-md p-1" style={{ background: "#10151b", border: `1px solid ${CARD_BORDER}` }}>
        {(["7d", "30d", "90d", "all"] as Range[]).map((item) => <button key={item} onClick={() => setRange(item)}
          className="rounded-sm px-3 py-1.5 text-xs font-bold transition-colors"
          style={{ background: range === item ? NEON : "transparent", color: range === item ? "#071000" : DASHBOARD_THEME.textMuted }}>
          {item === "all" ? "All time" : `Last ${item.replace("d", "")} days`}
        </button>)}
      </div>
    </header>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard label="Page views" metric={metrics?.pageViews} icon={Eye} />
      <MetricCard label="Unique visitors" metric={metrics?.uniqueVisitors} icon={Users} />
      <MetricCard label="Content views" metric={metrics?.contentViews} icon={Film} />
      <MetricCard label="Store clicks" metric={metrics?.storeClicks} icon={MousePointerClick} />
    </div>

    {data?.insight && <div className="rounded-md px-4 py-3 text-sm" style={{ background: "#101810", border: `1px solid rgba(183,255,24,0.25)`, color: "#e7f7cf" }}>{data.insight}</div>}

    <section className="rounded-md p-4 sm:p-5" style={cardStyle}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-bold text-white">Game discovery</h3><p className="text-xs mt-1" style={{ color: DASHBOARD_THEME.textMuted }}>Player activity over the selected period</p></div>
        <div className="flex gap-1">
          {([["pageViews", "Views"], ["uniqueVisitors", "Visitors"], ["storeClicks", "Store clicks"]] as const).map(([value, label]) =>
            <button key={value} onClick={() => setChartMetric(value)} className="rounded-sm px-2 py-1 text-[11px] font-semibold"
              style={{ background: chartMetric === value ? "rgba(183,255,24,0.14)" : "transparent", color: chartMetric === value ? NEON : DASHBOARD_THEME.textMuted }}>{label}</button>)}
        </div>
      </div>
      {series.length ? <div className="mt-4 h-56"><ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="label" tickFormatter={(_, index) => series[index]?.label ?? series[index]?.date} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#10151b", border: `1px solid ${CARD_BORDER}`, borderRadius: 3 }} labelStyle={{ color: "#fff" }} />
          <Line type="monotone" dataKey={chartMetric} stroke={NEON} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer></div> : <div className="py-8">
        <p className="text-sm font-semibold text-white">No discovery data yet</p>
        <p className="mt-1 text-xs" style={{ color: DASHBOARD_THEME.textMuted }}>Analytics will appear here as players discover your game.</p>
      </div>}
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-md p-4 sm:p-5" style={cardStyle}>
        <h3 className="font-bold text-white">Discovery sources</h3>
        {!discovery?.sourcesAvailable ? <p className="py-7 text-sm" style={{ color: DASHBOARD_THEME.textMuted }}>Source attribution is not available yet.</p> :
          sourceRows.length ? <div className="mt-3 space-y-2">{sourceRows.map((source, i) => <div key={`${source.label ?? source.name}-${i}`} className="flex justify-between gap-3 border-b py-2 text-sm" style={{ borderColor: DASHBOARD_THEME.borderSubtle }}>
            <span className="truncate text-white">{source.label ?? source.name ?? "Unknown"}</span><span style={{ color: DASHBOARD_THEME.textMuted }}>{number(source.value ?? source.visits ?? source.clicks)}</span>
          </div>)}</div> : <p className="py-7 text-sm" style={{ color: DASHBOARD_THEME.textMuted }}>No attributed discovery sources in this period.</p>}
      </section>
      <section className="rounded-md p-4 sm:p-5" style={cardStyle}>
        <h3 className="font-bold text-white">Store performance</h3>
        <div className="mt-1 text-xs" style={{ color: DASHBOARD_THEME.textMuted }}>{number(data?.stores?.totalClicks)} total clicks{data?.stores?.ctr != null ? ` · ${data.stores.ctr}% CTR` : ""}</div>
        {storeRows.length ? <div className="mt-3 space-y-2">{storeRows.map(store => <a key={store.key} href={store.url} target="_blank" rel="noreferrer" className="flex justify-between gap-3 border-b py-2 text-sm" style={{ borderColor: DASHBOARD_THEME.borderSubtle }}>
          <span className="truncate text-white">{store.label}</span><span style={{ color: NEON }}>{number(store.clicks)} clicks</span>
        </a>)}</div> : <p className="py-7 text-sm" style={{ color: DASHBOARD_THEME.textMuted }}>No connected store activity yet.</p>}
      </section>
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-md p-4 sm:p-5" style={cardStyle}>
        <h3 className="font-bold text-white">Content performance</h3>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[["Clips", content?.clips ?? data?.clipsGenerated], ["Reels", content?.reels ?? data?.reelsGenerated], ["Screenshots", content?.screenshots ?? data?.screenshotsGenerated]].map(([label, value]) => <div key={String(label)}>
            <div className="text-xl font-bold text-white">{number(value as number | undefined)}</div><div className="text-[10px] uppercase tracking-wide" style={{ color: DASHBOARD_THEME.textSubtle }}>{label}</div>
          </div>)}
        </div>
        <div className="mt-4 border-t pt-3 text-sm" style={{ borderColor: DASHBOARD_THEME.borderSubtle, color: DASHBOARD_THEME.textMuted }}>Total content views <span className="float-right text-white">{number(content?.totalContentViews)}</span></div>
      </section>
      <section className="rounded-md p-4 sm:p-5" style={cardStyle}>
        <h3 className="font-bold text-white">Top performing content</h3>
        {topContent.length ? <div className="mt-3 space-y-1">{topContent.map(row => <Link key={`${row.type ?? row.contentType}-${row.id}`} href={contentPath(row)} className="flex items-center gap-3 rounded-sm px-2 py-2 hover:bg-white/[0.04]">
          <div className="h-10 w-16 shrink-0 overflow-hidden rounded-sm bg-white/5">
            {row.thumbnailUrl && <img src={row.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-white">{row.title ?? row.name ?? "Untitled content"}</div>
            <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px]" style={{ color: DASHBOARD_THEME.textMuted }}>
              <span className="uppercase">{row.type ?? row.contentType}</span>
              {row.creator?.username && <span>@{row.creator.username}{row.verified ? " · Verified" : ""}</span>}
              {row.reactions != null && <span>{number(row.reactions)} reactions</span>}
            </div>
          </div>
          <span className="shrink-0 text-xs" style={{ color: DASHBOARD_THEME.textMuted }}>{number(row.views ?? row.viewCount)} views</span><ExternalLink className="w-3 h-3 shrink-0" style={{ color: DASHBOARD_THEME.textSubtle }} />
        </Link>)}</div> : <p className="py-7 text-sm" style={{ color: DASHBOARD_THEME.textMuted }}>No content performance data yet.</p>}
      </section>
    </div>

    {(creators.length > 0 || engagement.length > 0) && <div className="grid gap-5 lg:grid-cols-2">
      {creators.length > 0 && <section className="rounded-md p-4 sm:p-5" style={cardStyle}><h3 className="font-bold text-white">Top community creators</h3>
        <div className="mt-3 space-y-2">{creators.map(creator => <div key={creator.id} className="flex items-center gap-3 py-1">
          {creator.avatarUrl ? <img src={creator.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" /> : <div className="h-7 w-7 rounded-full bg-white/10" />}
          <div className="min-w-0 flex-1"><div className="truncate text-sm text-white">{creator.username}{creator.verified ? " · Verified" : ""}</div><div className="text-[10px]" style={{ color: DASHBOARD_THEME.textMuted }}>{number(creator.contentCount)} uploads</div></div><span className="text-xs" style={{ color: DASHBOARD_THEME.textMuted }}>{number(creator.views ?? creator.totalViews)} views</span>
        </div>)}</div></section>}
      {engagement.length > 0 && <section className="rounded-md p-4 sm:p-5" style={cardStyle}><h3 className="font-bold text-white">Player engagement</h3>
        <div className="mt-3 space-y-2">{engagement.map((item, i) => <div key={`${item.label ?? item.name}-${i}`} className="flex justify-between border-b py-2 text-sm" style={{ borderColor: DASHBOARD_THEME.borderSubtle }}>
          <span className="text-white">{item.label ?? item.name ?? "Engagement"}</span><span style={{ color: DASHBOARD_THEME.textMuted }}>{item.engagementRate != null ? `${item.engagementRate}%` : number(item.value ?? item.views ?? item.watchTime)}</span>
        </div>)}</div></section>}
    </div>}
  </div>;
}