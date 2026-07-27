import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, CheckCircle2, ChevronDown, ChevronUp, ArrowRight, Play } from "lucide-react";
import { SiSteam } from "react-icons/si";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";
import { ESSENTIAL_FIELDS, formatFieldName, isFieldFilled, type Profile, type FieldMeta } from "./edit-profile/types";
import { BasicInfoSection } from "./edit-profile/BasicInfoSection";
import { StudioSection } from "./edit-profile/StudioSection";
import { DescriptionSection } from "./edit-profile/DescriptionSection";
import { FeaturesSection } from "./edit-profile/FeaturesSection";
import { MediaSection } from "./edit-profile/MediaSection";
import { PlatformsSection } from "./edit-profile/PlatformsSection";
import { StoreLinksSection } from "./edit-profile/StoreLinksSection";
import { SocialSection } from "./edit-profile/SocialSection";
import { StoreSpecificSection } from "./edit-profile/StoreSpecificSection";
import { SyncSettingsSection } from "./edit-profile/SyncSettingsSection";
import { StoreImportPanel } from "./edit-profile/StoreImportPanel";
import { SyncPanel } from "./edit-profile/SyncPanel";

// ── Section field groups ───────────────────────────────────────────────────────
const SECTION_FIELDS: Record<string, string[]> = {
  basic: ["gameName", "releaseStatus", "releaseDate", "price"],
  studio: ["studioName", "studioFoundedYear", "studioTeamSize", "studioWebsite", "studioCountry"],
  description: ["shortDescription", "fullDescription"],
  features: ["keyFeatures", "genres", "tags"],
  media: ["headerImageUrl", "capsuleImageUrl", "trailerUrl", "screenshotUrls"],
  platforms: ["platforms"],
  stores: ["steamAppId", "steamUrl", "epicSlug", "epicUrl", "itchUrl"],
  social: ["websiteUrl", "twitterUrl", "discordUrl"],
  "store-specific": ["ageRating", "supportedLanguages", "contentDescriptors"],
  "sync-settings": ["autoSyncEnabled", "preferredSyncSource"],
};

// ── Profile Optimisation recommendations ──────────────────────────────────────
const RECOMMENDATIONS = [
  { field: "trailerUrl",         icon: "🎬", label: "Upload a Trailer",           reason: "Creators are more likely to request keys for games with gameplay footage.", section: "media" },
  { field: "screenshotUrls",     icon: "🖼️", label: "Add Screenshots",            reason: "Games with screenshots get significantly more creator attention.", section: "media" },
  { field: "genres",             icon: "🏷️", label: "Add Genres",                 reason: "Genres help creators find your game when filtering by their content style.", section: "features" },
  { field: "releaseDate",        icon: "📅", label: "Set a Release Date",          reason: "Creators prefer to plan coverage around a known launch window.", section: "basic" },
  { field: "keyFeatures",        icon: "⚡", label: "Add Key Features",            reason: "Key features give creators talking points to highlight in their videos.", section: "features" },
  { field: "fullDescription",    icon: "📝", label: "Write a Full Description",    reason: "A detailed description helps creators pitch your game confidently.", section: "description" },
  { field: "platforms",          icon: "💻", label: "Confirm Platforms",           reason: "Creators need to know which platforms your game runs on.", section: "platforms" },
  { field: "capsuleImageUrl",    icon: "🖼️", label: "Add Capsule Image",           reason: "Used as a thumbnail in search results and campaign listings.", section: "media" },
  { field: "twitterUrl",         icon: "🐦", label: "Add Twitter / X Link",        reason: "Lets creators tag you when sharing their content.", section: "social" },
  { field: "discordUrl",         icon: "💬", label: "Add Discord Server Link",     reason: "A community hub for creators to discuss your game.", section: "social" },
  { field: "price",              icon: "💰", label: "Set Your Game Price",          reason: "Creators often mention pricing to help their audience decide.", section: "basic" },
  { field: "studioName",         icon: "🏢", label: "Add Studio Name",             reason: "Helps creators credit your studio correctly in their content.", section: "studio" },
  { field: "tags",               icon: "🏷️", label: "Add Tags",                   reason: "Tags improve discoverability when creators search by genre or style.", section: "features" },
  { field: "websiteUrl",         icon: "🌐", label: "Add Your Website",            reason: "Gives creators a link to share for players who want to learn more.", section: "social" },
  { field: "supportedLanguages", icon: "🌍", label: "Add Supported Languages",     reason: "Helps match your game with creators whose audience speaks the right language.", section: "store-specific" },
  { field: "ageRating",          icon: "🔞", label: "Add Age Rating",              reason: "Required for some platform listings.", section: "store-specific" },
  { field: "contentDescriptors", icon: "⚠️", label: "Add Content Descriptors",    reason: "Informs creators of any sensitive content.", section: "store-specific" },
  { field: "studioCountry",      icon: "📍", label: "Add Studio Location",         reason: "Provides context about your team to regional creator audiences.", section: "studio" },
];

// ── Status computation ─────────────────────────────────────────────────────────
function computeSectionStatus(id: string, profile: Profile | null, filledCount: number, totalCount: number): { label: string; color: string } {
  if (!profile) return { label: "Not started", color: "#f59e0b" };
  const pct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  if (id === "media") {
    const hasHeader = isFieldFilled(profile, "headerImageUrl");
    const hasTrailer = isFieldFilled(profile, "trailerUrl");
    const hasScreenshots = isFieldFilled(profile, "screenshotUrls");
    if (!hasHeader) return { label: "⚠ Missing Banner", color: "#f59e0b" };
    if (!hasTrailer && !hasScreenshots) return { label: "Missing Trailer & Screenshots", color: "#f59e0b" };
    if (!hasTrailer) return { label: "Missing Trailer", color: "#f59e0b" };
    if (!hasScreenshots) return { label: "Missing Screenshots", color: "#f59e0b" };
    return { label: "✓ Complete", color: NEON };
  }

  if (id === "stores") {
    const hasSteam = isFieldFilled(profile, "steamUrl");
    const hasEpic = isFieldFilled(profile, "epicUrl");
    const hasItch = isFieldFilled(profile, "itchUrl");
    const connected = ([hasSteam && "Steam", hasEpic && "Epic", hasItch && "itch.io"] as (string | false)[]).filter(Boolean) as string[];
    if (connected.length === 0) return { label: "No stores linked", color: "#f59e0b" };
    if (connected.length >= 3) return { label: "✓ All stores linked", color: NEON };
    return { label: connected.join(" + ") + " connected", color: "#60a5fa" };
  }

  if (id === "platforms") {
    const platforms = (profile as any)?.platforms ?? [];
    if (!platforms.length) return { label: "No platforms set", color: "#f59e0b" };
    return { label: `${platforms.length} platform${platforms.length === 1 ? "" : "s"}`, color: platforms.length >= 2 ? NEON : "#60a5fa" };
  }

  if (id === "social") {
    if (pct === 0) return { label: "No links added", color: "#f59e0b" };
    if (pct === 100) return { label: "✓ Complete", color: NEON };
    return { label: "Some links missing", color: "#60a5fa" };
  }

  if (id === "sync-settings") {
    const autoSync = !!(profile as any)?.autoSyncEnabled;
    const preferred = (profile as any)?.preferredSyncSource;
    if (autoSync) return { label: "Auto-sync on", color: "#60a5fa" };
    if (preferred) return { label: `Preferred: ${preferred}`, color: "#60a5fa" };
    return { label: "Manual only", color: "rgba(255,255,255,0.3)" };
  }

  if (pct === 0) return { label: "Not started", color: "#f59e0b" };
  if (pct === 100) return { label: "✓ Complete", color: NEON };
  if (pct >= 75) return { label: "Excellent", color: "#4ade80" };
  if (pct >= 50) return { label: "Good", color: "#60a5fa" };
  return { label: "⚠ Needs Attention", color: "#f59e0b" };
}

function computeGroupStatus(sectionIds: string[], sectionFilled: (id: string) => number, sectionTotal: (id: string) => number): { label: string; color: string } {
  const totalFilled = sectionIds.reduce((acc, id) => acc + sectionFilled(id), 0);
  const total = sectionIds.reduce((acc, id) => acc + sectionTotal(id), 0);
  const pct = total > 0 ? Math.round((totalFilled / total) * 100) : 0;
  if (pct === 100) return { label: "✓ Complete", color: NEON };
  if (pct >= 75) return { label: "Excellent", color: "#4ade80" };
  if (pct >= 50) return { label: "Good", color: "#60a5fa" };
  if (pct > 0) return { label: "Needs Attention", color: "#f59e0b" };
  return { label: "Not started", color: "#f59e0b" };
}

// ── Group header ───────────────────────────────────────────────────────────────
function GroupHeader({ icon, label, status, statusColor }: { icon: string; label: string; status: string; statusColor: string }) {
  return (
    <div className="flex items-center justify-between pt-4 pb-2 px-1">
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{icon}</span>
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
        <span className="text-[10px] font-semibold" style={{ color: statusColor }}>{status}</span>
      </div>
    </div>
  );
}

// ── Media visual preview ───────────────────────────────────────────────────────
function MediaPreviewPanel({ profile }: { profile: Profile | null }) {
  const header = (profile as any)?.headerImageUrl as string | null;
  const capsule = (profile as any)?.capsuleImageUrl as string | null;
  const trailer = (profile as any)?.trailerUrl as string | null;
  const screenshots = ((profile as any)?.screenshotUrls ?? []) as string[];

  return (
    <div className="rounded-xl overflow-hidden p-4 space-y-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      {/* Banner */}
      <div className="relative rounded-lg overflow-hidden flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.04)", aspectRatio: "2.5 / 1" }}>
        {header ? (
          <img src={header} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <p className="text-[11px] text-white/20">No banner image — add one below</p>
        )}
        {header && (
          <div className="absolute bottom-0 left-0 right-0 px-2.5 py-1.5 flex items-center justify-between"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }}>
            <span className="text-[10px] font-semibold text-white/60">Banner</span>
          </div>
        )}
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: capsule ? "100px 1fr" : "1fr" }}>
        {/* Capsule */}
        {capsule && (
          <div className="rounded-lg overflow-hidden flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.04)", aspectRatio: "3/4" }}>
            <img src={capsule} alt="Capsule" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="space-y-2 min-w-0">
          {/* Trailer */}
          {trailer ? (
            <a href={trailer} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
              style={{ background: "rgba(184,255,27,0.07)", border: "1px solid rgba(184,255,27,0.2)", color: NEON }}>
              <Play size={12} fill={NEON} /> Watch Trailer
            </a>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px]"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.28)" }}>
              🎬 No trailer — recommended
            </div>
          )}

          {/* Screenshots */}
          {screenshots.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {screenshots.slice(0, 6).map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="rounded overflow-hidden block" style={{ aspectRatio: "16/9" }}>
                  <img src={url} alt={`Screenshot ${i + 1}`}
                    className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                </a>
              ))}
              {screenshots.length > 6 && (
                <div className="rounded flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", aspectRatio: "16/9" }}>
                  +{screenshots.length - 6}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px]"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.28)" }}>
              🖼 No screenshots — recommended
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function GameProfileTab() {
  const { toast } = useToast();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["basic"]));
  const [importOpen, setImportOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [showAllRecs, setShowAllRecs] = useState(false);

  const { data, isLoading } = useQuery<{ profile: Profile; fieldMeta: FieldMeta }>({
    queryKey: ["/api/indie/profile"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const profile = (data?.profile ?? null) as Profile | null;
  const fieldMeta = (data?.fieldMeta ?? {}) as FieldMeta;

  const saveMutation = useMutation({
    mutationFn: async ({ fieldName, value }: { fieldName: string; value: any }) =>
      apiRequest("PUT", "/api/indie/profile", { [fieldName]: value }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] }); toast({ description: "Saved." }); },
    onError: () => toast({ description: "Save failed.", variant: "gamefolioError" }),
  });

  const revertMutation = useMutation({
    mutationFn: async ({ fieldName }: { fieldName: string }) =>
      apiRequest("POST", "/api/indie/field-revert", { fieldName }),
    onSuccess: (_data: any, { fieldName }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] });
      toast({ description: `${formatFieldName(fieldName)} reverted to store value.` });
    },
    onError: (err: any) => toast({ description: err?.message ?? "Revert failed.", variant: "gamefolioError" }),
  });

  const handleSave = useCallback((fieldName: string, value: any) => saveMutation.mutate({ fieldName, value }), [saveMutation]);
  const handleRevert = useCallback((fieldName: string) => revertMutation.mutate({ fieldName }), [revertMutation]);
  const toggleSection = (id: string) => setOpenSections(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const sectionFilled = (id: string) => (SECTION_FIELDS[id] ?? []).filter(f => isFieldFilled(profile, f)).length;
  const sectionTotal = (id: string) => (SECTION_FIELDS[id] ?? []).length;
  const essentialFilled = ESSENTIAL_FIELDS.filter(f => isFieldFilled(profile, f)).length;
  const essentialPct = Math.round((essentialFilled / ESSENTIAL_FIELDS.length) * 100);
  const missingEssential = ESSENTIAL_FIELDS.filter(f => !isFieldFilled(profile, f));
  const isSaving = saveMutation.isPending || revertMutation.isPending;

  const pendingRecs = RECOMMENDATIONS.filter(r => !isFieldFilled(profile, r.field));
  const VISIBLE_COUNT = 4;
  const visibleRecs = showAllRecs ? pendingRecs : pendingRecs.slice(0, VISIBLE_COUNT);

  const openSection = (id: string) => {
    setOpenSections(prev => { const n = new Set(prev); n.add(id); return n; });
    setTimeout(() => {
      document.getElementById(`gp-section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const sharedProps = { profile, fieldMeta, onSave: handleSave, onRevert: handleRevert, isSaving };

  // Per-section statuses
  const ss = (id: string) => computeSectionStatus(id, profile, sectionFilled(id), sectionTotal(id));

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-white/30" /></div>;
  }

  return (
    <div className="space-y-4 max-w-3xl">

      {/* ── Launch Ready ──────────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${essentialPct === 100 ? "rgba(184,255,27,0.22)" : CARD_BORDER}` }}>
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
          <span className="text-xl leading-none">🚀</span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-black text-white">Launch Ready</span>
            <p className="text-[11px] text-white/40 mt-0.5">Required to publish and run creator campaigns</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs font-black" style={{ color: essentialPct === 100 ? NEON : "rgba(255,255,255,0.45)" }}>
              {essentialFilled}/{ESSENTIAL_FIELDS.length}
            </span>
            {essentialPct === 100 && <CheckCircle2 size={15} style={{ color: NEON }} />}
          </div>
        </div>
        {essentialPct === 100 ? (
          <div className="mx-5 mb-5 rounded-xl p-3.5 flex items-center gap-3"
            style={{ background: "rgba(184,255,27,0.07)", border: "1px solid rgba(184,255,27,0.18)" }}>
            <CheckCircle2 size={18} style={{ color: NEON, flexShrink: 0 }} />
            <div>
              <p className="text-sm font-bold leading-tight" style={{ color: NEON }}>Your game is ready for creator campaigns.</p>
              <p className="text-[11px] text-white/40 mt-0.5">All {ESSENTIAL_FIELDS.length} required fields are complete.</p>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-3">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${essentialPct}%`, background: "linear-gradient(90deg,rgba(255,255,255,0.4),rgba(255,255,255,0.65))" }} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missingEssential.map(f => (
                <span key={f} className="text-[10px] px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.22)", color: "#fde047" }}>
                  {formatFieldName(f)} required
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Profile Optimisation ──────────────────────────────────────────── */}
      {pendingRecs.length > 0 && (
        <div className="rounded-xl p-5 space-y-1" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className="text-sm font-black text-white">Profile Optimisation</span>
              <p className="text-[11px] text-white/40 mt-0.5">Improvements that increase creator interest and game discovery</p>
            </div>
            <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full mt-0.5"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.38)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {pendingRecs.length} available
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {visibleRecs.map((rec, i) => (
              <div key={rec.field} className="flex items-start gap-3 py-3.5" style={{ paddingTop: i === 0 ? 0 : undefined }}>
                <span className="text-base leading-none mt-0.5 shrink-0">{rec.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">{rec.label}</p>
                  <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{rec.reason}</p>
                </div>
                <button onClick={() => openSection(rec.section)}
                  className="shrink-0 flex items-center gap-0.5 text-[11px] font-bold mt-0.5 transition-opacity hover:opacity-70"
                  style={{ color: NEON }}>
                  Add <ArrowRight size={11} />
                </button>
              </div>
            ))}
          </div>
          {pendingRecs.length > VISIBLE_COUNT && (
            <button onClick={() => setShowAllRecs(v => !v)}
              className="flex items-center gap-1.5 text-[11px] text-white/35 hover:text-white/55 transition-colors pt-2">
              {showAllRecs
                ? <><ChevronUp size={13} /> Show fewer</>
                : <><ChevronDown size={13} /> Show {pendingRecs.length - VISIBLE_COUNT} more improvements</>}
            </button>
          )}
        </div>
      )}

      {pendingRecs.length === 0 && essentialPct === 100 && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <span className="text-xl">✨</span>
          <div>
            <p className="text-sm font-bold text-white">Profile fully optimised</p>
            <p className="text-[11px] text-white/40 mt-0.5">Your game page is in great shape for creators.</p>
          </div>
        </div>
      )}

      {/* ── Store toolbar ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setImportOpen(p => !p); setSyncOpen(false); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
          style={{ background: importOpen ? `${NEON}22` : CARD_BG, border: `1px solid ${importOpen ? NEON : CARD_BORDER}`, color: importOpen ? NEON : "white" }}>
          <SiSteam size={14} /> Import from Store
        </button>
        <button onClick={() => { setSyncOpen(p => !p); setImportOpen(false); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
          style={{ background: syncOpen ? "rgba(99,102,241,0.15)" : CARD_BG, border: `1px solid ${syncOpen ? "#6366f1" : CARD_BORDER}`, color: syncOpen ? "#818cf8" : "white" }}>
          <RefreshCw size={14} /> Check for Updates
        </button>
      </div>

      {importOpen && (
        <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-4">Import from Store</h3>
          <StoreImportPanel profile={profile} fieldMeta={fieldMeta} onImported={() => setImportOpen(false)}
            onGoToStoreLinks={() => {
              setOpenSections(prev => { const n = new Set(prev); n.add("stores"); return n; });
              setImportOpen(false);
              setTimeout(() => document.getElementById("gp-section-stores")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
            }} />
        </div>
      )}

      {syncOpen && (
        <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-4">Sync with Store</h3>
          <SyncPanel profile={profile} onSynced={() => setSyncOpen(false)} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          GROUP 1 — GAME
      ══════════════════════════════════════════════════════════════════════ */}
      <GroupHeader icon="🎮" label="Game"
        {...computeGroupStatus(["basic", "description", "features"], sectionFilled, sectionTotal)} />

      <div id="gp-section-basic">
        <BasicInfoSection {...sharedProps} open={openSections.has("basic")} onToggle={() => toggleSection("basic")}
          filledCount={sectionFilled("basic")} totalCount={sectionTotal("basic")}
          {...ss("basic")} />
      </div>
      <div id="gp-section-description">
        <DescriptionSection {...sharedProps} open={openSections.has("description")} onToggle={() => toggleSection("description")}
          filledCount={sectionFilled("description")} totalCount={sectionTotal("description")}
          {...ss("description")} />
      </div>
      <div id="gp-section-features">
        <FeaturesSection {...sharedProps} open={openSections.has("features")} onToggle={() => toggleSection("features")}
          filledCount={sectionFilled("features")} totalCount={sectionTotal("features")}
          {...ss("features")} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          GROUP 2 — MEDIA
      ══════════════════════════════════════════════════════════════════════ */}
      <GroupHeader icon="🖼️" label="Media"
        {...computeGroupStatus(["media"], sectionFilled, sectionTotal)} />

      <MediaPreviewPanel profile={profile} />

      <div id="gp-section-media">
        <MediaSection {...sharedProps} open={openSections.has("media")} onToggle={() => toggleSection("media")}
          filledCount={sectionFilled("media")} totalCount={sectionTotal("media")}
          {...ss("media")} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          GROUP 3 — DISTRIBUTION
      ══════════════════════════════════════════════════════════════════════ */}
      <GroupHeader icon="🚀" label="Distribution"
        {...computeGroupStatus(["platforms", "stores", "store-specific"], sectionFilled, sectionTotal)} />

      <div id="gp-section-platforms">
        <PlatformsSection {...sharedProps} open={openSections.has("platforms")} onToggle={() => toggleSection("platforms")}
          filledCount={sectionFilled("platforms")} totalCount={sectionTotal("platforms")}
          {...ss("platforms")} />
      </div>
      <div id="gp-section-stores">
        <StoreLinksSection {...sharedProps} open={openSections.has("stores")} onToggle={() => toggleSection("stores")}
          filledCount={sectionFilled("stores")} totalCount={sectionTotal("stores")}
          {...ss("stores")} />
      </div>
      <div id="gp-section-store-specific">
        <StoreSpecificSection {...sharedProps} open={openSections.has("store-specific")} onToggle={() => toggleSection("store-specific")}
          filledCount={sectionFilled("store-specific")} totalCount={sectionTotal("store-specific")}
          {...ss("store-specific")} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          GROUP 4 — STUDIO
      ══════════════════════════════════════════════════════════════════════ */}
      <GroupHeader icon="🏢" label="Studio"
        {...computeGroupStatus(["studio", "social", "sync-settings"], sectionFilled, sectionTotal)} />

      <div id="gp-section-studio">
        <StudioSection {...sharedProps} open={openSections.has("studio")} onToggle={() => toggleSection("studio")}
          filledCount={sectionFilled("studio")} totalCount={sectionTotal("studio")}
          {...ss("studio")} />
      </div>
      <div id="gp-section-social">
        <SocialSection {...sharedProps} open={openSections.has("social")} onToggle={() => toggleSection("social")}
          filledCount={sectionFilled("social")} totalCount={sectionTotal("social")}
          {...ss("social")} />
      </div>
      <div id="gp-section-sync-settings">
        <SyncSettingsSection {...sharedProps} open={openSections.has("sync-settings")} onToggle={() => toggleSection("sync-settings")}
          filledCount={sectionFilled("sync-settings")} totalCount={sectionTotal("sync-settings")}
          {...ss("sync-settings")} />
      </div>

    </div>
  );
}
