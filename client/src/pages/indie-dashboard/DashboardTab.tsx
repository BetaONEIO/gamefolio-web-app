import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { publicUrl } from "@/lib/platform";
import { useSignedUrl } from "@/hooks/use-signed-url";
import {
  ArrowUpRight, BarChart3, CheckCircle2, ChevronRight, CircleAlert,
  Edit3, Eye, Film, Gamepad2, ImagePlus, Loader2, MousePointerClick,
  Plus, Settings2, Sparkles, Users, Video,
} from "lucide-react";
import { NEON, CARD_BG, DASHBOARD_THEME, rgbaAccent } from "./constants";
import { ESSENTIAL_FIELDS, OPTIONAL_FIELDS, isFieldFilled } from "./edit-profile/types";
import IndieDevUpgradeDialog from "@/components/IndieDevUpgradeDialog";

type TopTabId = "overview" | "creator-content" | "analytics" | "game-profile";

type AnalyticsData = {
  game?: { id: number; name: string };
  range?: { key?: string };
  metrics?: {
    pageViews?: { value?: number; changePct?: number | null };
    contentViews?: { value?: number; scope?: string };
    storeClicks?: { value?: number; changePct?: number | null };
  };
  content?: {
    clips?: number;
    reels?: number;
    screenshots?: number;
    totalContentViews?: number;
  };
};

type ContentItem = {
  id: number;
  type: "clip" | "reel" | "screenshot";
  title?: string | null;
  thumbnailUrl?: string | null;
  thumbnail_url?: string | null;
  views?: number | null;
  creatorUsername?: string | null;
  creator_username?: string | null;
  isDeveloperUpload?: boolean;
  createdAt?: string;
};

type ContentResponse = {
  ownedGameContent?: ContentItem[];
  items?: ContentItem[];
  ownedGameContentTotal?: number;
};

const FIELD_LABELS: Record<string, string> = {
  gameName: "Name your game",
  shortDescription: "Add a short description",
  headerImageUrl: "Upload a banner image",
  steamUrl: "Add a Steam store link",
  epicUrl: "Add an Epic Games link",
  itchUrl: "Add an itch.io link",
  trailerUrl: "Upload a game trailer",
  fullDescription: "Write a full description",
  screenshotUrls: "Add screenshots",
  capsuleImageUrl: "Add a game icon",
  keyFeatures: "List key features",
  genres: "Choose game genres",
  tags: "Add discovery tags",
  platforms: "Select supported platforms",
  releaseDate: "Set a release date",
  websiteUrl: "Add your game website",
  discordUrl: "Connect your Discord",
  twitterUrl: "Add your social link",
  ageRating: "Add an age rating",
  supportedLanguages: "Add supported languages",
  contentDescriptors: "Add content descriptors",
};

const RECOMMENDED_ORDER = [
  "trailerUrl", "fullDescription", "screenshotUrls", "capsuleImageUrl",
  "keyFeatures", "genres", "tags", "platforms", "releaseDate", "websiteUrl",
  "discordUrl", "twitterUrl", "ageRating", "supportedLanguages", "contentDescriptors",
];

function formatNumber(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString();
}

function periodLabel(range?: string) {
  if (range === "7d") return "Last 7 days";
  if (range === "90d") return "Last 90 days";
  if (range === "all") return "All time";
  return "Last 30 days";
}

function profileFieldLabel(field: string) {
  return FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

function getProfileProgress(profile: any) {
  const fields = [...ESSENTIAL_FIELDS, ...OPTIONAL_FIELDS.filter((field) => !ESSENTIAL_FIELDS.includes(field))];
  const filled = fields.filter((field) => isFieldFilled(profile, field)).length;
  return {
    filled,
    total: fields.length,
    percent: fields.length ? Math.round((filled / fields.length) * 100) : 0,
    missingRequired: ESSENTIAL_FIELDS.filter((field) => !isFieldFilled(profile, field)),
    missingRecommended: RECOMMENDED_ORDER.filter((field) => !isFieldFilled(profile, field)),
  };
}

function MetricCard({
  label,
  value,
  scope,
  changePct,
  icon: Icon,
  isLoading,
}: {
  label: string;
  value?: number | null;
  scope: string;
  changePct?: number | null;
  icon: typeof Eye;
  isLoading?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-2xl p-4 sm:p-5" style={{ background: CARD_BG, border: `1px solid ${DASHBOARD_THEME.border}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: rgbaAccent(0.1) }}>
          <Icon className="h-4 w-4" style={{ color: NEON }} />
        </div>
        {changePct != null && (
          <span className="text-[10px] font-black" style={{ color: changePct >= 0 ? NEON : DASHBOARD_THEME.danger }}>
            {changePct >= 0 ? "+" : ""}{changePct}%
          </span>
        )}
      </div>
      <div className="mt-5 text-2xl font-black tracking-tight text-white">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-white/30" /> : formatNumber(value)}
      </div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/55">{label}</div>
      <div className="mt-1 text-[10px] text-white/25">{scope}</div>
    </div>
  );
}

function ContentPreviewCard({ item, onOpen }: { item: ContentItem; onOpen: () => void }) {
  const thumbnail = item.thumbnailUrl ?? item.thumbnail_url ?? null;
  const { signedUrl } = useSignedUrl(thumbnail);
  const creator = item.creatorUsername ?? item.creator_username ?? "creator";
  const Icon = item.type === "screenshot" ? ImagePlus : item.type === "reel" ? Video : Film;

  return (
    <button type="button" onClick={onOpen} className="group min-w-0 overflow-hidden rounded-xl text-left transition-transform hover:-translate-y-0.5">
      <div className="relative aspect-video overflow-hidden rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DASHBOARD_THEME.borderSubtle}` }}>
        {signedUrl ? (
          <img src={signedUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center"><Icon className="h-6 w-6 text-white/20" /></div>
        )}
        <span className="absolute bottom-2 left-2 rounded-md px-1.5 py-1 text-[8px] font-black uppercase tracking-wider text-white/80" style={{ background: "rgba(0,0,0,0.65)" }}>
          {item.type}
        </span>
      </div>
      <div className="min-w-0 px-0.5 pt-2">
        <div className="truncate text-[11px] font-bold text-white/75">{item.title || "Untitled content"}</div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-white/30">
          <span className="truncate">@{creator}</span>
          <span className="flex shrink-0 items-center gap-1"><Eye className="h-3 w-3" />{formatNumber(item.views ?? 0)}</span>
        </div>
      </div>
    </button>
  );
}

function SetupRow({ field, required, onEdit }: { field: string; required?: boolean; onEdit: () => void }) {
  return (
    <button type="button" onClick={onEdit} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.04]">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ border: `1px solid ${required ? "rgba(230,107,115,0.45)" : DASHBOARD_THEME.border}` }}>
        {required ? <CircleAlert className="h-3 w-3" style={{ color: DASHBOARD_THEME.danger }} /> : <div className="h-1.5 w-1.5 rounded-full bg-white/25" />}
      </div>
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/70 group-hover:text-white">{profileFieldLabel(field)}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/20 group-hover:text-white/60" />
    </button>
  );
}

function FinishSettingUp({
  progress,
  onEdit,
}: {
  progress: ReturnType<typeof getProfileProgress>;
  onEdit: (field: string) => void;
}) {
  if (progress.percent >= 100) {
    return (
      <section className="rounded-2xl px-4 py-3.5 sm:px-5" style={{ background: rgbaAccent(0.07), border: `1px solid ${rgbaAccent(0.2)}` }}>
        <div className="flex flex-wrap items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: NEON }} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-white">Your game profile is ready</div>
            <div className="mt-0.5 text-[11px] text-white/40">All profile details are complete and ready to share.</div>
          </div>
          <button type="button" onClick={() => onEdit("gameName")} className="text-[11px] font-black text-white/45 hover:text-white">Edit details</button>
        </div>
      </section>
    );
  }

  const required = progress.missingRequired;
  const recommended = progress.missingRecommended;
  return (
    <section className="overflow-hidden rounded-2xl" style={{ background: CARD_BG, border: `1px solid ${DASHBOARD_THEME.border}` }}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b px-4 py-4 sm:px-5" style={{ borderColor: DASHBOARD_THEME.borderSubtle }}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: rgbaAccent(0.1) }}>
            <Settings2 className="h-4 w-4" style={{ color: NEON }} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Finish setting up</h3>
            <p className="mt-1 text-[11px] text-white/35">Make your game page useful before you send players there.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-black text-white/55">
          <span>{progress.percent}%</span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress.percent}%`, background: progress.percent >= 50 ? NEON : DASHBOARD_THEME.warning }} />
          </div>
        </div>
      </div>
      <div className="grid gap-5 p-3 sm:grid-cols-2 sm:p-4">
        <div>
          <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: DASHBOARD_THEME.danger }}>Required</div>
          {required.length ? required.map((field) => <SetupRow key={field} field={field} required onEdit={() => onEdit(field)} />) : (
            <div className="px-3 py-3 text-xs text-white/35">All required details are complete.</div>
          )}
        </div>
        <div>
          <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Recommended</div>
          {recommended.slice(0, 5).map((field) => <SetupRow key={field} field={field} onEdit={() => onEdit(field)} />)}
          {recommended.length > 5 && (
            <button type="button" onClick={() => onEdit(recommended[5])} className="px-3 py-2 text-[11px] font-bold text-white/35 hover:text-white/70">
              View more recommendations <ArrowUpRight className="ml-1 inline h-3 w-3" />
            </button>
          )}
          {!recommended.length && <div className="px-3 py-3 text-xs text-white/35">Everything recommended is complete.</div>}
        </div>
      </div>
    </section>
  );
}

export default function DashboardTab({
  onGoTo,
  onQuickEdit,
  gameId,
}: {
  onGoTo: (tab: TopTabId, sub?: string) => void;
  onQuickEdit?: (field: string) => void;
  gameId?: number;
}) {
  const { user } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data: profileData, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/indie/profile", gameId ?? null],
    queryFn: () => fetch(`/api/indie/profile${gameId ? `?gameId=${gameId}` : ""}`, { credentials: "include" }).then((response) => response.json()),
  });
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/indie/analytics", gameId, "30d"],
    queryFn: async () => {
      const params = new URLSearchParams({ range: "30d" });
      if (gameId != null) params.set("gameId", String(gameId));
      const response = await fetch(`/api/indie/analytics?${params.toString()}`, { credentials: "include" });
      if (!response.ok) throw new Error("Unable to load analytics");
      return response.json();
    },
  });
  const { data: contentData, isLoading: contentLoading } = useQuery<ContentResponse | null>({
    queryKey: ["/api/indie/creator-content", "creator", gameId ?? null],
    queryFn: async () => {
      const params = new URLSearchParams({ source: "creator" });
      if (gameId != null) params.set("gameId", String(gameId));
      const response = await fetch(`/api/indie/creator-content?${params.toString()}`, { credentials: "include" });
      if (response.status === 401) return null;
      if (!response.ok) throw new Error("Unable to load community content");
      return response.json();
    },
  });

  const profile = profileData?.profile ?? null;
  const progress = getProfileProgress(profile);
  const allContent = contentData?.ownedGameContent ?? contentData?.items ?? [];
  const communityContent = allContent;
  const communityContentTotal = contentData?.ownedGameContentTotal;
  const metrics = analyticsData?.metrics;
  const profileUrl = user?.username && profile?.id
    ? publicUrl(`/studio/${encodeURIComponent(user.username)}?gameId=${profile.id}`)
    : null;
  const firstMissingField = progress.missingRequired[0] ?? progress.missingRecommended[0] ?? "gameName";
  const editProfile = (field = firstMissingField) => {
    if (onQuickEdit) onQuickEdit(field);
    else onGoTo("game-profile", field);
  };
  const gameName = profile?.gameName ?? analyticsData?.game?.name ?? "your game";

  return (
    <div className="space-y-7 pb-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: NEON }}>
            <LayoutIcon />
            Developer control centre
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Good to see you, {user?.displayName || user?.username || "developer"}.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/40">Manage <span className="font-bold text-white/65">{gameName}</span>, see how players are finding it, and keep your game page moving forward.</p>
        </div>
        {profileUrl && (
          <a href={profileUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl px-3.5 py-2.5 text-xs font-black text-white/65 transition-colors hover:text-white sm:self-auto" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${DASHBOARD_THEME.border}` }}>
            View public page <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </header>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-white">Game performance</h2>
            <p className="mt-1 text-[11px] text-white/30">A quick read on {gameName}.</p>
          </div>
          <button type="button" onClick={() => onGoTo("analytics")} className="flex items-center gap-1 text-[11px] font-bold text-white/35 hover:text-white/70">Full analytics <ChevronRight className="h-3.5 w-3.5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Page views" value={metrics?.pageViews?.value} changePct={metrics?.pageViews?.changePct} scope={periodLabel(analyticsData?.range?.key)} icon={Eye} isLoading={analyticsLoading} />
          <MetricCard label="Content views" value={metrics?.contentViews?.value} scope="All-time total" icon={Film} isLoading={analyticsLoading} />
          <MetricCard label="Store clicks" value={metrics?.storeClicks?.value} changePct={metrics?.storeClicks?.changePct} scope={periodLabel(analyticsData?.range?.key)} icon={MousePointerClick} isLoading={analyticsLoading} />
          <MetricCard label="Community posts" value={communityContentTotal} scope="All-time uploads" icon={Users} isLoading={contentLoading} />
        </div>
      </section>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0 space-y-7">
          <FinishSettingUp progress={progress} onEdit={editProfile} />

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.12em] text-white">Recent community content</h2>
                <p className="mt-1 text-[11px] text-white/30">The latest clips, reels, and screenshots shared for {gameName}.</p>
              </div>
              <button type="button" onClick={() => onGoTo("creator-content")} className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-white/35 hover:text-white/70">View all <ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
            {contentLoading ? (
              <div className="flex items-center justify-center rounded-2xl py-12" style={{ background: DASHBOARD_THEME.surfaceSubtle, border: `1px dashed ${DASHBOARD_THEME.borderSubtle}` }}><Loader2 className="h-5 w-5 animate-spin text-white/30" /></div>
            ) : communityContent.length ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {communityContent.slice(0, 4).map((item) => <ContentPreviewCard key={`${item.type}-${item.id}`} item={item} onOpen={() => onGoTo("creator-content")} />)}
              </div>
            ) : (
              <div className="rounded-2xl px-5 py-10 text-center" style={{ background: DASHBOARD_THEME.surfaceSubtle, border: `1px dashed ${DASHBOARD_THEME.borderSubtle}` }}>
                <Film className="mx-auto h-7 w-7 text-white/15" />
                <p className="mt-3 text-sm font-bold text-white/45">No community content yet</p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-white/25">When players share clips, reels, or screenshots for your game, they will show up here.</p>
                <button type="button" onClick={() => onGoTo("creator-content")} className="mt-4 text-xs font-black" style={{ color: NEON }}>Open content manager <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" /></button>
              </div>
            )}
          </section>
        </main>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-2xl p-4 sm:p-5" style={{ background: CARD_BG, border: `1px solid ${DASHBOARD_THEME.border}` }}>
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: NEON }} />
              <h2 className="text-sm font-black text-white">Quick actions</h2>
            </div>
            <div className="space-y-2">
              <QuickAction icon={Edit3} label="Edit game profile" onClick={() => editProfile("gameName")} />
              <QuickAction icon={ImagePlus} label="Add screenshots" onClick={() => editProfile("screenshotUrls")} />
              <QuickAction icon={BarChart3} label="Open analytics" onClick={() => onGoTo("analytics")} />
              <QuickAction icon={Plus} label="Review community content" onClick={() => onGoTo("creator-content")} />
              {profileUrl ? (
                <a href={profileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white">
                  <Eye className="h-4 w-4 text-white/35" /> View public game page <ArrowUpRight className="ml-auto h-3 w-3 text-white/25" />
                </a>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl p-5" style={{ background: `linear-gradient(145deg, ${rgbaAccent(0.12)}, rgba(255,255,255,0.025) 70%)`, border: `1px solid ${rgbaAccent(0.22)}` }}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: rgbaAccent(0.13) }}><Gamepad2 className="h-4 w-4" style={{ color: NEON }} /></div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: NEON }}>Game Developer Pro</div>
                <h2 className="mt-2 text-base font-black text-white">{user?.isIndieDevSubscriber ? "Your developer tools are active" : "Build more momentum"}</h2>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-white/40">
              {user?.isIndieDevSubscriber
                ? "Your Pro access is active. Keep your profile and community presence working together."
                : "Unlock expanded developer tools and promotion benefits built for your game."}
            </p>
            <button type="button" onClick={() => setShowUpgrade(true)} className="mt-4 w-full rounded-xl py-2.5 text-xs font-black transition-all hover:brightness-110" style={{ background: user?.isIndieDevSubscriber ? "rgba(255,255,255,0.07)" : NEON, color: user?.isIndieDevSubscriber ? "rgba(255,255,255,0.75)" : "#071000" }}>
              {user?.isIndieDevSubscriber ? "View Pro details" : "Explore Developer Pro"}
            </button>
          </section>

          {!profileLoading && progress.percent < 100 && (
            <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[11px] leading-relaxed text-white/35" style={{ background: "rgba(230,107,115,0.05)", border: "1px solid rgba(230,107,115,0.14)" }}>
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: DASHBOARD_THEME.danger }} />
              <span><strong className="text-white/60">{progress.missingRequired.length} required {progress.missingRequired.length === 1 ? "detail" : "details"}</strong> still needed before your page is launch-ready.</span>
            </div>
          )}
        </aside>
      </div>

      <IndieDevUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Edit3; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white">
      <Icon className="h-4 w-4 text-white/35" /> <span className="flex-1">{label}</span><ChevronRight className="h-3 w-3 text-white/20" />
    </button>
  );
}

function LayoutIcon() {
  return <div className="h-1.5 w-1.5 rounded-full" style={{ background: NEON, boxShadow: `0 0 10px ${NEON}` }} />;
}