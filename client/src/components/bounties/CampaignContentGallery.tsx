import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Check, Play, X } from "lucide-react";

export type CampaignContentItem = {
  id: number;
  objectiveId: number;
  slotIndex: number;
  type: string;
  status: string;
  objectiveTitle: string;
  title: string;
  text: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  reviewNotes: string;
};

const visibleStatuses = new Set(["staged", "pending", "submitted", "under_review", "approved", "changes_requested", "rejected"]);
const mediaTypes = new Set(["screenshot", "clip", "reel"]);

function contentText(raw: unknown): string {
  let content = raw;
  if (typeof raw === "string") {
    try { content = JSON.parse(raw); } catch { return raw; }
  }
  if (!content || typeof content !== "object") return "";
  const value = content as Record<string, unknown>;
  return typeof value.text === "string" ? value.text
    : typeof value.streamUrl === "string" ? value.streamUrl
    : typeof value.url === "string" ? value.url
    : Array.isArray(value.links) ? value.links.filter((link): link is string => typeof link === "string").join("\n") : "";
}

export function campaignContentItems(objectives: any[]): CampaignContentItem[] {
  return objectives.flatMap((objective: any) => {
    const latest = new Map<number, any>();
    const submissions = Array.isArray(objective.submissions) ? objective.submissions : [];
    for (const [index, submission] of submissions.entries()) {
      if (!visibleStatuses.has(String(submission.status ?? "").toLowerCase())) continue;
      const slot = Number(submission.slot_index ?? index);
      if (!Number.isInteger(slot) || slot < 0) continue;
      if (!latest.has(slot) || Number(submission.id) > Number(latest.get(slot).id)) latest.set(slot, submission);
    }
    return Array.from(latest, ([slotIndex, submission]) => ({
      id: Number(submission.id),
      objectiveId: Number(objective.id),
      slotIndex,
      type: String(objective.content_type ?? submission.content_type ?? "").toLowerCase(),
      status: String(submission.status).toLowerCase(),
      objectiveTitle: String(objective.title ?? "Campaign mission"),
      title: String(submission.media_title ?? ""),
      text: contentText(submission.content_data) || String(submission.content_url ?? ""),
      mediaUrl: submission.media_url ?? submission.content_url ?? null,
      thumbnailUrl: submission.thumbnail_url ?? null,
      duration: Number(submission.media_duration_seconds) > 0 ? Number(submission.media_duration_seconds) : null,
      reviewNotes: String(submission.review_notes ?? ""),
    }));
  }).sort((a, b) => a.objectiveId - b.objectiveId || a.slotIndex - b.slotIndex);
}

const categoryLabels: Record<string, string> = {
  screenshot: "Screenshots", clip: "Gameplay clips", reel: "Reels",
  feedback: "Feedback", review: "Reviews", stream: "Livestreams",
  bug: "Bug reports", session: "Play sessions",
};
const labelFor = (type: string) => categoryLabels[type] ?? type.replace(/_/g, " ");
const durationLabel = (seconds: number) =>
  `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;

type Props = {
  objectives: any[];
  state?: "draft" | "submitted" | "approved" | "locked";
  reviewer?: boolean;
  busy?: boolean;
  selectedIds?: number[];
  onMarkForChanges?: (id: number) => void;
  onEdit?: (item: CampaignContentItem) => void;
  onRemove?: (item: CampaignContentItem) => void;
};

export function CampaignContentGallery({
  objectives, state = "draft", reviewer = false, busy = false,
  selectedIds = [], onMarkForChanges, onEdit, onRemove,
}: Props) {
  const [filter, setFilter] = useState("all");
  const [preview, setPreview] = useState<CampaignContentItem | null>(null);
  const [pendingRemove, setPendingRemove] = useState<CampaignContentItem | null>(null);
  const items = campaignContentItems(objectives);
  const types = Array.from(new Set(items.map(item => item.type)));
  const activeFilter = types.includes(filter) ? filter : "all";
  const displayed = activeFilter === "all" ? items : items.filter(item => item.type === activeFilter);
  const visual = displayed.filter(item => mediaTypes.has(item.type));
  const written = displayed.filter(item => !mediaTypes.has(item.type));
  const canRemove = (item: CampaignContentItem) =>
    !reviewer && state === "draft" && item.status === "staged" && Boolean(onRemove);
  const canEdit = (item: CampaignContentItem) =>
    !reviewer && state === "draft" && ["staged", "changes_requested", "rejected"].includes(item.status) && Boolean(onEdit);
  const displayTitle = (item: CampaignContentItem) => item.title ||
    `${item.type === "clip" ? "Gameplay clip" : item.type === "reel" ? "Reel" : "Screenshot"} ${String(item.slotIndex + 1).padStart(2, "0")}`;
  const status = (item: CampaignContentItem) =>
    item.status === "changes_requested" ? "Changes requested" : item.status === "approved" ? "Approved" : "";

  return (
    <section className="mt-10 border-t border-white/[0.12] pt-8" aria-label={reviewer ? "Creator submission" : "Campaign content"}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
            {reviewer ? "Creator submission" : state === "submitted" ? "Submitted content" : state === "approved" || state === "locked" ? "Campaign content" : "Uploaded content"}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-white/50">
            {reviewer ? "Review the creator's submitted work before deciding." : state === "draft"
              ? "Everything you've added to this campaign. Review your content before submitting it for approval."
              : `${items.length} item${items.length === 1 ? "" : "s"} ${state === "locked" ? "saved" : "submitted"}${state === "approved" ? " · Approved" : state === "submitted" ? " · Under review" : ""}.`}
          </p>
        </div>
        {state === "approved" && !reviewer && <span className="text-xs font-black uppercase text-green-400"><Check size={14} className="mr-1 inline" />Approved</span>}
      </div>
      {items.length === 0 ? (
        <p className="mt-7 border-t border-white/[0.08] pt-5 text-xs text-white/45">
          {reviewer ? "No submitted content yet." : "Nothing added yet. Use the mission actions above to start building your campaign submission."}
        </p>
      ) : (
        <>
          <div role="tablist" aria-label="Filter campaign content" className="mt-6 flex gap-6 overflow-x-auto border-b border-white/[0.12] whitespace-nowrap">
            {["all", ...types].map(type => {
              const count = type === "all" ? items.length : items.filter(item => item.type === type).length;
              return <button key={type} type="button" role="tab" aria-selected={activeFilter === type}
                onClick={() => setFilter(type)}
                className={`shrink-0 border-b-2 pb-3 text-[11px] font-black uppercase tracking-wider transition-colors ${activeFilter === type ? "border-[#B9FF1A] text-white" : "border-transparent text-white/45 hover:text-white"}`}>
                {type === "all" ? "All" : labelFor(type)} <span className="ml-1 tabular-nums text-[#B9FF1A]">{count}</span>
              </button>;
            })}
          </div>
          {visual.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
              {visual.map(item => {
                const video = item.type === "clip" || item.type === "reel";
                const poster = item.thumbnailUrl || (!video && item.mediaUrl);
                return <article key={item.id} className="min-w-0">
                  <button type="button" onClick={() => setPreview(item)} aria-label={`Preview ${displayTitle(item)}`}
                    className={`group relative block w-full overflow-hidden bg-black/35 text-left ${item.type === "reel" ? "aspect-[3/4]" : "aspect-video"} ${item.status === "changes_requested" ? "outline outline-1 outline-amber-300/70" : ""}`}>
                    {poster ? <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
                      : video && item.mediaUrl ? <video src={item.mediaUrl} preload="metadata" className="h-full w-full object-cover" />
                      : <span className="flex h-full items-center justify-center text-xs text-white/45">Preview unavailable</span>}
                    {video && <span className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/65 text-white"><Play size={19} fill="currentColor" /></span>}
                    {video && item.duration != null && <span className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">{durationLabel(item.duration)}</span>}
                  </button>
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="truncate text-xs font-bold text-white/85">{displayTitle(item)}</div><div className="mt-0.5 truncate text-[10px] text-white/45">{item.objectiveTitle}</div></div>
                    {canRemove(item) && <button type="button" onClick={() => setPendingRemove(item)} aria-label={`Remove ${displayTitle(item)}`} disabled={busy} className="shrink-0 text-lg leading-none text-white/40 hover:text-white disabled:opacity-40">×</button>}
                  </div>
                  {status(item) && <p className={`mt-1 text-[10px] font-black uppercase ${item.status === "approved" ? "text-green-400" : "text-amber-300"}`}>{status(item)}</p>}
                  {item.reviewNotes && <p className="mt-1 line-clamp-2 text-[11px] text-amber-200">{item.reviewNotes}</p>}
                  {canEdit(item) && <button type="button" onClick={() => onEdit?.(item)} className="mt-1 text-[10px] font-bold text-[#B9FF1A]">Replace</button>}
                  {reviewer && item.status === "under_review" && onMarkForChanges && <button type="button" onClick={() => onMarkForChanges(item.id)} className={`mt-1 block text-[10px] font-bold ${selectedIds.includes(item.id) ? "text-amber-300" : "text-white/55"}`}>{selectedIds.includes(item.id) ? "Selected for changes" : "Mark for changes"}</button>}
                </article>;
              })}
            </div>
          )}
          {written.length > 0 && (
            <div className="mt-7 space-y-0 border-t border-white/[0.08]">
              {written.map(item => <article key={item.id} className={`border-b py-5 ${item.status === "changes_requested" ? "border-amber-300/45" : "border-white/[0.08]"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-white/55">{labelFor(item.type)} {String(item.slotIndex + 1).padStart(2, "0")} · {item.objectiveTitle}</div>
                    <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/80">{item.text || "No written preview available."}</p>
                    {status(item) && <p className={`mt-2 text-[10px] font-black uppercase ${item.status === "approved" ? "text-green-400" : "text-amber-300"}`}>{status(item)}</p>}
                    {item.reviewNotes && <p className="mt-1 text-xs text-amber-200">{item.reviewNotes}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    {canEdit(item) && <button type="button" onClick={() => onEdit?.(item)} className="text-[10px] font-bold uppercase text-[#B9FF1A]">View / edit</button>}
                    {canRemove(item) && <button type="button" disabled={busy} onClick={() => setPendingRemove(item)} className="text-[10px] font-bold uppercase text-white/45 hover:text-white disabled:opacity-40">Remove</button>}
                    {reviewer && item.status === "under_review" && onMarkForChanges && <button type="button" onClick={() => onMarkForChanges(item.id)} className={`text-[10px] font-bold ${selectedIds.includes(item.id) ? "text-amber-300" : "text-white/55"}`}>{selectedIds.includes(item.id) ? "Selected for changes" : "Mark for changes"}</button>}
                  </div>
                </div>
              </article>)}
            </div>
          )}
        </>
      )}
      {preview && createPortal(
        <div className="fixed inset-0 z-[200002] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onKeyDown={event => { if (event.key === "Escape") setPreview(null); }}>
          <div role="dialog" aria-modal="true" aria-label={`Preview ${displayTitle(preview)}`} className="w-full max-w-4xl bg-[#0F101B] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0"><div className="truncate text-sm font-bold text-white">{displayTitle(preview)}</div><div className="text-xs text-white/50">{preview.objectiveTitle}{preview.duration != null ? ` · ${durationLabel(preview.duration)}` : ""}</div></div>
              <button type="button" autoFocus aria-label="Close preview" onClick={() => setPreview(null)} className="p-1 text-white/60 hover:text-white"><X size={18} /></button>
            </div>
            {preview.type === "screenshot" && (preview.mediaUrl || preview.thumbnailUrl) ? <img src={preview.mediaUrl ?? preview.thumbnailUrl!} alt={displayTitle(preview)} className="max-h-[75vh] w-full object-contain" />
              : preview.mediaUrl ? <video key={preview.mediaUrl} src={preview.mediaUrl} poster={preview.thumbnailUrl ?? undefined} controls autoPlay className="max-h-[75vh] w-full bg-black object-contain" />
              : <p className="py-16 text-center text-sm text-white/50">Preview unavailable.</p>}
            {(canEdit(preview) || canRemove(preview)) && <div className="mt-4 flex justify-end gap-5 text-xs font-bold uppercase">
              {canEdit(preview) && <button type="button" onClick={() => { onEdit?.(preview); setPreview(null); }} className="text-[#B9FF1A]">Replace</button>}
              {canRemove(preview) && <button type="button" onClick={() => setPendingRemove(preview)} disabled={busy} className="text-white/55">Remove</button>}
            </div>}
          </div>
        </div>, document.body
      )}
      {pendingRemove && createPortal(
        <div className="fixed inset-0 z-[200003] flex items-center justify-center bg-black/85 p-4">
          <div role="alertdialog" aria-modal="true" aria-label={`Remove ${labelFor(pendingRemove.type)}`} className="w-full max-w-sm border border-white/15 bg-[#0F101B] p-6">
            <h3 className="text-sm font-black uppercase text-white">Remove {labelFor(pendingRemove.type)}?</h3>
            <p className="mt-2 text-xs leading-relaxed text-white/55">This will remove the item from your campaign submission. You can add a new one before submitting.</p>
            <div className="mt-5 flex justify-end gap-4 text-xs font-black uppercase">
              <button type="button" autoFocus onClick={() => setPendingRemove(null)} className="text-white/55">Cancel</button>
              <button type="button" disabled={busy} onClick={() => { onRemove?.(pendingRemove); setPendingRemove(null); setPreview(null); }} className="text-red-300 disabled:opacity-40">Remove</button>
            </div>
          </div>
        </div>, document.body
      )}
    </section>
  );
}