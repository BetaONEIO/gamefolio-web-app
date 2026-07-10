import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { SiSteam } from "react-icons/si";
import { NEON, CARD_BG, CARD_BORDER } from "../IndieDashboardPage";
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

export default function GameProfileTab() {
  const { toast } = useToast();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["basic"]));
  const [importOpen, setImportOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  const { data, isLoading } = useQuery<{ profile: Profile; fieldMeta: FieldMeta }>({
    queryKey: ["/api/indie/profile"],
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
  const optionalFilled = OPTIONAL_FIELDS.filter(f => isFieldFilled(profile, f)).length;
  const essentialPct = Math.round((essentialFilled / ESSENTIAL_FIELDS.length) * 100);
  const missingEssential = ESSENTIAL_FIELDS.filter(f => !isFieldFilled(profile, f));
  const isSaving = saveMutation.isPending || revertMutation.isPending;

  const sharedProps = { profile, fieldMeta, onSave: handleSave, onRevert: handleRevert, isSaving };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-white/30" /></div>;
  }

  return (
    <div className="space-y-4 max-w-3xl">

      {/* Profile Completeness */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white">Profile Completeness</span>
          <span className="text-xs font-bold" style={{ color: essentialPct === 100 ? NEON : "rgba(255,255,255,0.5)" }}>
            {essentialFilled}/{ESSENTIAL_FIELDS.length} essential · {optionalFilled}/{OPTIONAL_FIELDS.length} optional
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${essentialPct}%`, background: essentialPct === 100 ? NEON : "linear-gradient(90deg,#fff4,#fff8)" }} />
        </div>
        {missingEssential.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {missingEssential.map(f => (
              <span key={f} className="text-[10px] px-2 py-0.5 rounded-full text-yellow-400"
                style={{ background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)" }}>
                {formatFieldName(f)} missing
              </span>
            ))}
          </div>
        )}
        {essentialPct === 100 && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: NEON }}>
            <CheckCircle2 size={13} /> All essential fields complete — your public profile looks great!
          </p>
        )}
      </div>

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
          <StoreImportPanel profile={profile} fieldMeta={fieldMeta} onImported={() => setImportOpen(false)} />
        </div>
      )}

      {syncOpen && (
        <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-4">Sync with Store</h3>
          <SyncPanel profile={profile} onSynced={() => setSyncOpen(false)} />
        </div>
      )}

      {/* 8 edit sections */}
      <BasicInfoSection {...sharedProps} open={openSections.has("basic")} onToggle={() => toggleSection("basic")} filledCount={sectionFilled("basic")} totalCount={sectionTotal("basic")} />
      <StudioSection {...sharedProps} open={openSections.has("studio")} onToggle={() => toggleSection("studio")} filledCount={sectionFilled("studio")} totalCount={sectionTotal("studio")} />
      <DescriptionSection {...sharedProps} open={openSections.has("description")} onToggle={() => toggleSection("description")} filledCount={sectionFilled("description")} totalCount={sectionTotal("description")} />
      <FeaturesSection {...sharedProps} open={openSections.has("features")} onToggle={() => toggleSection("features")} filledCount={sectionFilled("features")} totalCount={sectionTotal("features")} />
      <MediaSection {...sharedProps} open={openSections.has("media")} onToggle={() => toggleSection("media")} filledCount={sectionFilled("media")} totalCount={sectionTotal("media")} />
      <PlatformsSection {...sharedProps} open={openSections.has("platforms")} onToggle={() => toggleSection("platforms")} filledCount={sectionFilled("platforms")} totalCount={sectionTotal("platforms")} />
      <StoreLinksSection {...sharedProps} open={openSections.has("stores")} onToggle={() => toggleSection("stores")} filledCount={sectionFilled("stores")} totalCount={sectionTotal("stores")} />
      <SocialSection {...sharedProps} open={openSections.has("social")} onToggle={() => toggleSection("social")} filledCount={sectionFilled("social")} totalCount={sectionTotal("social")} />
      <StoreSpecificSection {...sharedProps} open={openSections.has("store-specific")} onToggle={() => toggleSection("store-specific")} filledCount={sectionFilled("store-specific")} totalCount={sectionTotal("store-specific")} />
      <SyncSettingsSection {...sharedProps} open={openSections.has("sync-settings")} onToggle={() => toggleSection("sync-settings")} filledCount={sectionFilled("sync-settings")} totalCount={sectionTotal("sync-settings")} />
    </div>
  );
}
