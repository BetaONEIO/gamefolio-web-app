import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, CheckCircle2, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { SiSteam } from "react-icons/si";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";
import { ESSENTIAL_FIELDS, OPTIONAL_FIELDS, formatFieldName, isFieldFilled, type Profile, type FieldMeta } from "./edit-profile/types";
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

// Field groups per section used for completeness counters
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

// ── Profile Optimisation recommendations (ordered by creator-impact) ──────────
const RECOMMENDATIONS = [
  { field: "trailerUrl",         icon: "🎬", label: "Upload a Trailer",           reason: "Creators are more likely to request keys for games with gameplay footage.", section: "media" },
  { field: "screenshotUrls",     icon: "🖼️", label: "Add More Screenshots",       reason: "Games with screenshots get significantly more creator attention.", section: "media" },
  { field: "genres",             icon: "🏷️", label: "Add Genres",                 reason: "Genres help creators find your game when filtering by their content style.", section: "features" },
  { field: "releaseDate",        icon: "📅", label: "Set a Release Date",          reason: "Creators prefer to plan coverage around a known launch window.", section: "basic" },
  { field: "keyFeatures",        icon: "⚡", label: "Add Key Features",            reason: "Key features give creators talking points to highlight in their videos.", section: "features" },
  { field: "fullDescription",    icon: "📝", label: "Write a Full Description",    reason: "A detailed description helps creators pitch your game confidently to their audience.", section: "description" },
  { field: "platforms",          icon: "💻", label: "Confirm Platforms",           reason: "Creators need to know which platforms your game runs on before requesting a key.", section: "platforms" },
  { field: "capsuleImageUrl",    icon: "🖼️", label: "Add Capsule Image",           reason: "Used as a thumbnail in search results, game cards and campaign listings.", section: "media" },
  { field: "twitterUrl",         icon: "🐦", label: "Add a Twitter / X Link",      reason: "Lets creators tag you when sharing their content — free promotion for your game.", section: "social" },
  { field: "discordUrl",         icon: "💬", label: "Add a Discord Server Link",   reason: "A community hub for creators to discuss your game with other players.", section: "social" },
  { field: "price",              icon: "💰", label: "Set Your Game Price",          reason: "Creators often mention pricing to help their audience decide whether to buy.", section: "basic" },
  { field: "studioName",         icon: "🏢", label: "Add Studio Name",             reason: "Helps creators credit your studio correctly in their content.", section: "studio" },
  { field: "tags",               icon: "🏷️", label: "Add Tags",                   reason: "Tags improve discoverability when creators search by genre or style.", section: "features" },
  { field: "websiteUrl",         icon: "🌐", label: "Add Your Website",            reason: "Gives creators a link to share for players who want to learn more.", section: "social" },
  { field: "supportedLanguages", icon: "🌍", label: "Add Supported Languages",     reason: "Helps match your game with creators whose audience speaks the right language.", section: "store-specific" },
  { field: "ageRating",          icon: "🔞", label: "Add Age Rating",              reason: "Required for some platform listings and helps filter appropriate creator audiences.", section: "store-specific" },
  { field: "contentDescriptors", icon: "⚠️", label: "Add Content Descriptors",    reason: "Informs creators of any sensitive content so they can frame it accurately.", section: "store-specific" },
  { field: "studioCountry",      icon: "📍", label: "Add Studio Location",         reason: "Provides context about your team and can resonate with regional creator audiences.", section: "studio" },
];

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

  // Recommendations: only unfilled fields, in priority order
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

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-white/30" /></div>;
  }

  return (
    <div className="space-y-4 max-w-3xl">

      {/* ── SECTION 1: Launch Ready ─────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${essentialPct === 100 ? "rgba(184,255,27,0.22)" : CARD_BORDER}` }}>

        {/* Header row */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
          <span className="text-xl leading-none">🚀</span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-black text-white">Launch Ready</span>
            <p className="text-[11px] text-white/40 mt-0.5 leading-snug">
              Required to publish and run creator campaigns
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs font-black" style={{ color: essentialPct === 100 ? NEON : "rgba(255,255,255,0.45)" }}>
              {essentialFilled}/{ESSENTIAL_FIELDS.length}
            </span>
            {essentialPct === 100 && <CheckCircle2 size={15} style={{ color: NEON }} />}
          </div>
        </div>

        {/* Success state */}
        {essentialPct === 100 ? (
          <div className="mx-5 mb-5 rounded-xl p-3.5 flex items-center gap-3"
            style={{ background: "rgba(184,255,27,0.07)", border: "1px solid rgba(184,255,27,0.18)" }}>
            <CheckCircle2 size={18} style={{ color: NEON, flexShrink: 0 }} />
            <div>
              <p className="text-sm font-bold leading-tight" style={{ color: NEON }}>
                Your game is ready for creator campaigns.
              </p>
              <p className="text-[11px] text-white/40 mt-0.5">
                All {ESSENTIAL_FIELDS.length} required fields are complete.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-3">
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${essentialPct}%`, background: "linear-gradient(90deg,rgba(255,255,255,0.4),rgba(255,255,255,0.65))" }} />
            </div>
            {/* Missing fields */}
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

      {/* ── SECTION 2: Profile Optimisation ─────────────────────────────── */}
      {pendingRecs.length > 0 && (
        <div className="rounded-xl p-5 space-y-1" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className="text-sm font-black text-white">Profile Optimisation</span>
              <p className="text-[11px] text-white/40 mt-0.5 leading-snug">
                Improvements that increase creator interest and game discovery
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full mt-0.5"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.38)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {pendingRecs.length} available
            </span>
          </div>

          {/* Recommendations list */}
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {visibleRecs.map((rec, i) => (
              <div key={rec.field} className="flex items-start gap-3 py-3.5" style={{ paddingTop: i === 0 ? 0 : undefined }}>
                <span className="text-base leading-none mt-0.5 shrink-0">{rec.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">{rec.label}</p>
                  <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{rec.reason}</p>
                </div>
                <button
                  onClick={() => openSection(rec.section)}
                  className="shrink-0 flex items-center gap-0.5 text-[11px] font-bold mt-0.5 transition-opacity hover:opacity-70"
                  style={{ color: NEON }}>
                  Add <ArrowRight size={11} />
                </button>
              </div>
            ))}
          </div>

          {/* Show more / less */}
          {pendingRecs.length > VISIBLE_COUNT && (
            <button
              onClick={() => setShowAllRecs(v => !v)}
              className="flex items-center gap-1.5 text-[11px] text-white/35 hover:text-white/55 transition-colors pt-2">
              {showAllRecs ? (
                <><ChevronUp size={13} /> Show fewer</>
              ) : (
                <><ChevronDown size={13} /> Show {pendingRecs.length - VISIBLE_COUNT} more improvements</>
              )}
            </button>
          )}
        </div>
      )}

      {/* All optimisations complete */}
      {pendingRecs.length === 0 && essentialPct === 100 && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <span className="text-xl">✨</span>
          <div>
            <p className="text-sm font-bold text-white">Profile fully optimised</p>
            <p className="text-[11px] text-white/40 mt-0.5">Your game page is in great shape for creators.</p>
          </div>
        </div>
      )}

      {/* Store toolbar */}
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
          <StoreImportPanel
            profile={profile}
            fieldMeta={fieldMeta}
            onImported={() => setImportOpen(false)}
            onGoToStoreLinks={() => {
              setOpenSections(prev => { const n = new Set(prev); n.add("stores"); return n; });
              setImportOpen(false);
              setTimeout(() => {
                document.getElementById("store-links-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 80);
            }}
          />
        </div>
      )}

      {syncOpen && (
        <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-4">Sync with Store</h3>
          <SyncPanel profile={profile} onSynced={() => setSyncOpen(false)} />
        </div>
      )}

      {/* Edit sections — each wrapped with a scroll-target id matching RECOMMENDATIONS[].section */}
      <div id="gp-section-basic"><BasicInfoSection {...sharedProps} open={openSections.has("basic")} onToggle={() => toggleSection("basic")} filledCount={sectionFilled("basic")} totalCount={sectionTotal("basic")} /></div>
      <div id="gp-section-studio"><StudioSection {...sharedProps} open={openSections.has("studio")} onToggle={() => toggleSection("studio")} filledCount={sectionFilled("studio")} totalCount={sectionTotal("studio")} /></div>
      <div id="gp-section-description"><DescriptionSection {...sharedProps} open={openSections.has("description")} onToggle={() => toggleSection("description")} filledCount={sectionFilled("description")} totalCount={sectionTotal("description")} /></div>
      <div id="gp-section-features"><FeaturesSection {...sharedProps} open={openSections.has("features")} onToggle={() => toggleSection("features")} filledCount={sectionFilled("features")} totalCount={sectionTotal("features")} /></div>
      <div id="gp-section-media"><MediaSection {...sharedProps} open={openSections.has("media")} onToggle={() => toggleSection("media")} filledCount={sectionFilled("media")} totalCount={sectionTotal("media")} /></div>
      <div id="gp-section-platforms"><PlatformsSection {...sharedProps} open={openSections.has("platforms")} onToggle={() => toggleSection("platforms")} filledCount={sectionFilled("platforms")} totalCount={sectionTotal("platforms")} /></div>
      <div id="gp-section-stores" style={{ scrollMarginTop: "80px" }}>
        <StoreLinksSection {...sharedProps} open={openSections.has("stores")} onToggle={() => toggleSection("stores")} filledCount={sectionFilled("stores")} totalCount={sectionTotal("stores")} />
      </div>
      <div id="gp-section-social"><SocialSection {...sharedProps} open={openSections.has("social")} onToggle={() => toggleSection("social")} filledCount={sectionFilled("social")} totalCount={sectionTotal("social")} /></div>
      <div id="gp-section-store-specific"><StoreSpecificSection {...sharedProps} open={openSections.has("store-specific")} onToggle={() => toggleSection("store-specific")} filledCount={sectionFilled("store-specific")} totalCount={sectionTotal("store-specific")} /></div>
      <div id="gp-section-sync-settings"><SyncSettingsSection {...sharedProps} open={openSections.has("sync-settings")} onToggle={() => toggleSection("sync-settings")} filledCount={sectionFilled("sync-settings")} totalCount={sectionTotal("sync-settings")} /></div>
    </div>
  );
}
