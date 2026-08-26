import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Film, Video, Camera, Star, CheckCircle2, Eye, Flame } from "lucide-react";
import { useSignedUrl } from "@/hooks/use-signed-url";
import SubmissionReviewTab from "./SubmissionReviewTab";
import { NEON, DASHBOARD_THEME, rgbaAccent } from "./constants";

const FILTER_OPTIONS = [
  { id: "all",        label: "All",        icon: Film },
  { id: "clip",       label: "Clips",      icon: Film },
  { id: "reel",       label: "Reels",      icon: Video },
  { id: "screenshot", label: "Screenshots", icon: Camera },
];

type CreatorContentItem = {
  id: number;
  type: "clip" | "reel" | "screenshot";
  title?: string | null;
  thumbnailUrl?: string | null;
  thumbnail_url?: string | null;
  views?: number | null;
  creatorUsername?: string | null;
  creator_username?: string | null;
  gameName?: string | null;
  game_name?: string | null;
  isDeveloperUpload?: boolean;
  featured?: boolean;
  fires?: number | null;
};

type CreatorContentResponse = {
  items?: CreatorContentItem[];
  ownedGameContent?: CreatorContentItem[];
  ownedGameContentTotal?: number;
};

function filterByType(items: CreatorContentItem[], filter: string) {
  return filter === "all" ? items : items.filter((item) => item.type === filter);
}

function ContentGrid({ items, showGame }: { items: CreatorContentItem[]; showGame: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item) => <ContentCard key={`${item.type}-${item.id}`} item={item} showGame={showGame} />)}
    </div>
  );
}

function ContentCard({ item, showGame }: { item: CreatorContentItem; showGame: boolean }) {
  const thumbnailUrl = item.thumbnailUrl ?? item.thumbnail_url ?? null;
  const { signedUrl: displayThumbnailUrl } = useSignedUrl(thumbnailUrl);
  const creatorUsername = item.creatorUsername ?? item.creator_username ?? "creator";
  const gameName = item.gameName ?? item.game_name;
  return (
    <div className="rounded-xl overflow-hidden group"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="aspect-video relative overflow-hidden">
        {displayThumbnailUrl ? (
          <img src={displayThumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.035)" }}>
            {item.type === "screenshot" ? <Camera className="w-5 h-5 text-white/15" />
              : item.type === "reel" ? <Video className="w-5 h-5 text-white/15" />
              : <Film className="w-5 h-5 text-white/15" />}
          </div>
        )}
        <div className="absolute top-1.5 left-1.5 flex gap-1">
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
            style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.65)" }}>
            {item.type}
          </span>
          {item.isDeveloperUpload && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(183,255,24,0.18)", color: NEON }}>
              YOU
            </span>
          )}
        </div>
        {item.featured && (
          <div className="absolute top-1.5 right-1.5">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <div className="text-[10px] font-semibold text-white/75 truncate">{item.title || "Untitled content"}</div>
        {showGame && gameName && <div className="text-[9px] mt-0.5 text-white/30 truncate">{gameName}</div>}
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] text-white/35 truncate">@{creatorUsername}</span>
          <span className="text-[9px] text-white/25 flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {(item.views ?? 0).toLocaleString()}
          </span>
        </div>
        {item.fires && item.fires > 0 && (
          <span className="mt-1 text-[9px] flex items-center gap-0.5" style={{ color: DASHBOARD_THEME.accent }}>
            <Flame className="w-3 h-3" />
            {item.fires}
          </span>
        )}
        <div className="flex gap-1 mt-2">
          <button className="flex-1 text-[9px] font-bold py-1 rounded transition-all hover:brightness-110"
            style={{ background: rgbaAccent(0.09), color: NEON }}>
            <CheckCircle2 className="w-3 h-3 inline mr-0.5" />
            Feature
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreatorContentTab() {
  const [filter, setFilter] = useState("all");

  const { data: contentData } = useQuery<CreatorContentResponse | null>({
    queryKey: ["/api/indie/creator-content"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const ownedGameContent = contentData?.ownedGameContent ?? contentData?.items ?? [];
  const filteredOwnedGameContent = filterByType(ownedGameContent, filter);
  const totalItems = filteredOwnedGameContent.length;

  return (
    <div className="space-y-8">
      {/* Submissions to Review — shown at top if any exist */}
      <SubmissionReviewTab />

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map(({ id, label, icon: Icon }) => {
          const active = filter === id;
          return (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                 background: active ? rgbaAccent(0.10) : DASHBOARD_THEME.surfaceSubtle,
                 color: active ? NEON : DASHBOARD_THEME.textMuted,
                 border: active ? `1px solid ${rgbaAccent(0.25)}` : `1px solid ${DASHBOARD_THEME.borderSubtle}`,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
        <span className="text-xs text-white/25 ml-2">
          {totalItems} item{totalItems !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Content for games the developer manages */}
      {totalItems === 0 ? (
        <div className="rounded-2xl px-8 py-16 text-center"
          style={{ background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.07)" }}>
          <Film className="w-10 h-10 mx-auto mb-3 text-white/10" />
          <p className="text-sm font-semibold text-white/40 mb-1">
            {filter === "all" ? "No content for your games yet" : `No ${filter}s found`}
          </p>
          <p className="text-xs text-white/20 max-w-sm mx-auto">
            Clips, reels and screenshots published for games you manage will appear here.
          </p>
        </div>
      ) : (
        <section>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-white">Content for your games</h2>
              <p className="mt-1 text-xs text-white/35">
                Everything published for the catalogue games you manage.
              </p>
            </div>
            <span className="text-xs text-white/25">{filteredOwnedGameContent.length} item{filteredOwnedGameContent.length !== 1 ? "s" : ""}</span>
          </div>
          <ContentGrid items={filteredOwnedGameContent} showGame={true} />
        </section>
      )}
    </div>
  );
}
