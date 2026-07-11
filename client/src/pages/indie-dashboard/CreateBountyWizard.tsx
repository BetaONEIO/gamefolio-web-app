import { useState, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, authedFetch } from "@/lib/queryClient";
import type { Game } from "@shared/schema";
import {
  Loader2, Plus, Check, Gamepad2, Search, X,
  Upload, Video, Camera, Radio, Sparkles, Film, ImagePlus,
} from "lucide-react";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";

async function uploadBountyMedia(file: File): Promise<{ url: string; type: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await authedFetch("/api/games/bounties/upload-media", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Upload failed");
  }
  return res.json();
}

const inputStyle = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff", borderRadius: "10px", padding: "10px 14px", width: "100%",
  outline: "none", fontSize: "14px",
};
const labelStyle = {
  fontSize: "11px", fontWeight: 700, textTransform: "uppercase" as const,
  letterSpacing: "1px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px",
};

const STEPS = [
  "Game & Basics",
  "Requirements",
  "Rewards & Keys",
  "Scheduling",
  "Moderation",
  "Review & Publish",
];

const BOUNTY_TYPES = [
  { id: "upload_clips", label: "Upload Clips", icon: Video, desc: "Creators upload clips/reels of your game" },
  { id: "screenshots", label: "Screenshots", icon: Camera, desc: "Creators share screenshots" },
  { id: "livestream", label: "Livestream", icon: Radio, desc: "Creators go live playing your game" },
  { id: "review", label: "Written Review", icon: Sparkles, desc: "Creators post content with a required tag/keyword" },
];

interface WizardState {
  gameId: number | null;
  gameName: string;
  title: string;
  campaignTitle: string;
  description: string;
  bountyType: string;
  requiredClips: string;
  requiredReels: string;
  requiredScreenshots: string;
  requiredViews: string;
  minClipLength: string;
  requiredTag: string;
  requiredKeywords: string;
  maxSubmissionsPerUser: string;
  mustBePublic: boolean;
  blockDuplicates: boolean;
  manualApprovalRequired: boolean;
  demoKeyPool: string;
  fullKeyPool: string;
  xpJoin: string;
  xpPerClip: string;
  xpPerReel: string;
  xpPerScreenshot: string;
  xpViewMilestone: string;
  xpCompletionBonus: string;
  completionBadge: string;
  maxParticipants: string;
  startDate: string;
  endDate: string;
  regionRestriction: string;
  hashtags: string;
  trailerUrl: string;
  screenshotUrls: string[];
}

const initialState: WizardState = {
  gameId: null, gameName: "",
  title: "", campaignTitle: "", description: "", bountyType: "upload_clips",
  requiredClips: "2", requiredReels: "1", requiredScreenshots: "0", requiredViews: "500",
  minClipLength: "0", requiredTag: "", requiredKeywords: "", maxSubmissionsPerUser: "1",
  mustBePublic: true, blockDuplicates: true, manualApprovalRequired: true,
  demoKeyPool: "", fullKeyPool: "",
  xpJoin: "500", xpPerClip: "1000", xpPerReel: "2500", xpPerScreenshot: "200",
  xpViewMilestone: "2500", xpCompletionBonus: "5000", completionBadge: "",
  maxParticipants: "10", startDate: "", endDate: "", regionRestriction: "", hashtags: "",
  trailerUrl: "", screenshotUrls: [],
};

const MAX_SCREENSHOTS = 6;

function GamePicker({ value, onSelect }: { value: WizardState; onSelect: (id: number, name: string) => void }) {
  const [query, setQuery] = useState(value.gameName);
  const [open, setOpen] = useState(false);

  const { data: results = [], isFetching } = useQuery<Game[]>({
    queryKey: ["/api/games/search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await apiRequest("GET", `/api/games/search/${encodeURIComponent(query.trim())}`);
      return res.json();
    },
    enabled: open && query.trim().length > 0,
  });

  return (
    <div className="relative">
      <label style={labelStyle}>Game *</label>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          style={{ ...inputStyle, paddingLeft: "36px" }}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); onSelect(0, ""); }}
          onFocus={() => setOpen(true)}
          placeholder="Search for your game..."
        />
        {value.gameId ? <Check className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2" style={{ color: NEON }} /> : null}
      </div>
      {open && query.trim() && (
        <div
          className="absolute z-20 mt-1 w-full rounded-xl max-h-60 overflow-y-auto"
          style={{ background: "#0B1218", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          {isFetching && (
            <div className="p-3 text-xs text-gray-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...</div>
          )}
          {!isFetching && results.length === 0 && (
            <div className="p-3 text-xs text-gray-500">No games found</div>
          )}
          {results.map((g) => (
            <button
              key={g.id}
              type="button"
              className="flex items-center gap-2 w-full p-2.5 text-left hover:bg-white/5"
              onClick={() => { onSelect(g.id, g.name); setQuery(g.name); setOpen(false); }}
            >
              {g.imageUrl ? (
                <img src={g.imageUrl} className="w-7 h-7 rounded-md object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-md flex items-center justify-center bg-white/5"><Gamepad2 className="w-3.5 h-3.5 text-gray-500" /></div>
              )}
              <span className="text-sm text-white">{g.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TrailerUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast({ title: "Invalid file", description: "Please select a video file.", variant: "gamefolioError" as any });
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadBountyMedia(file);
      onChange(url);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Could not upload trailer video.", variant: "gamefolioError" as any });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label style={labelStyle}>Trailer Video (optional)</label>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {value ? (
        <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
          <video src={value} controls className="w-full max-h-56 bg-black" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.65)" }}
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-colors"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.18)" }}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: NEON }} />
          ) : (
            <Film className="w-5 h-5" style={{ color: "rgba(255,255,255,0.4)" }} />
          )}
          <span className="text-xs text-gray-400">{uploading ? "Uploading..." : "Click to upload a trailer video"}</span>
        </button>
      )}
    </div>
  );
}

function ScreenshotsUpload({ values, onChange }: { values: string[]; onChange: (urls: string[]) => void }) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_SCREENSHOTS - values.length;
    if (remaining <= 0) {
      toast({ title: "Limit reached", description: `You can add up to ${MAX_SCREENSHOTS} screenshots.`, variant: "gamefolioError" as any });
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        toUpload.map(async (file) => {
          if (!file.type.startsWith("image/")) return null;
          const { url } = await uploadBountyMedia(file);
          return url;
        })
      );
      const urls = uploaded.filter((u): u is string => !!u);
      if (urls.length > 0) onChange([...values, ...urls]);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Could not upload screenshot.", variant: "gamefolioError" as any });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <label style={labelStyle}>Screenshots (optional, up to {MAX_SCREENSHOTS})</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {values.map((url, i) => (
          <div key={url + i} className="relative rounded-lg overflow-hidden aspect-video" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
            <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.65)" }}
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        {values.length < MAX_SCREENSHOTS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg aspect-video flex flex-col items-center justify-center gap-1"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.18)" }}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: NEON }} />
            ) : (
              <ImagePlus className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
            )}
            <span className="text-[10px] text-gray-500">{uploading ? "Uploading" : "Add"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function CreateBountyWizard({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [w, setW] = useState<WizardState>(initialState);

  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) => setW((s) => ({ ...s, [key]: value }));

  const totalXp = useMemo(() => {
    return (parseInt(w.xpJoin) || 0)
      + (parseInt(w.xpPerClip) || 0) * (parseInt(w.requiredClips) || 0)
      + (parseInt(w.xpPerReel) || 0) * (parseInt(w.requiredReels) || 0)
      + (parseInt(w.xpPerScreenshot) || 0) * (parseInt(w.requiredScreenshots) || 0)
      + (parseInt(w.xpViewMilestone) || 0)
      + (parseInt(w.xpCompletionBonus) || 0);
  }, [w]);

  const demoKeyCount = w.demoKeyPool.split(/\n|,/).map((k) => k.trim()).filter(Boolean).length;
  const fullKeyCount = w.fullKeyPool.split(/\n|,/).map((k) => k.trim()).filter(Boolean).length;

  const mutation = useMutation({
    mutationFn: async (status: "active" | "draft") => {
      if (!w.gameId) throw new Error("Select a game first");
      const payload = {
        title: w.title.trim(),
        campaignTitle: w.campaignTitle.trim() || null,
        description: w.description.trim() || null,
        bountyType: w.bountyType,
        maxParticipants: parseInt(w.maxParticipants) || 10,
        startDate: w.startDate || null,
        endDate: w.endDate || null,
        demoKeyPool: w.demoKeyPool.split(/\n|,/).map((k) => k.trim()).filter(Boolean),
        fullKeyPool: w.fullKeyPool.split(/\n|,/).map((k) => k.trim()).filter(Boolean),
        requiredClips: parseInt(w.requiredClips) || 0,
        requiredReels: parseInt(w.requiredReels) || 0,
        requiredScreenshots: parseInt(w.requiredScreenshots) || 0,
        requiredViews: parseInt(w.requiredViews) || 0,
        minClipLength: parseInt(w.minClipLength) || 0,
        requiredTag: w.requiredTag.trim() || null,
        requiredKeywords: w.requiredKeywords.trim() || null,
        maxSubmissionsPerUser: parseInt(w.maxSubmissionsPerUser) || 1,
        mustBePublic: w.mustBePublic,
        blockDuplicates: w.blockDuplicates,
        manualApprovalRequired: w.manualApprovalRequired,
        xpJoin: parseInt(w.xpJoin) || 0,
        xpPerClip: parseInt(w.xpPerClip) || 0,
        xpPerReel: parseInt(w.xpPerReel) || 0,
        xpPerScreenshot: parseInt(w.xpPerScreenshot) || 0,
        xpViewMilestone: parseInt(w.xpViewMilestone) || 0,
        xpCompletionBonus: parseInt(w.xpCompletionBonus) || 0,
        completionBadge: w.completionBadge.trim() || null,
        regionRestriction: w.regionRestriction.trim() || null,
        hashtags: w.hashtags.split(/[\s,]+/).map((h) => h.replace(/^#/, "").trim()).filter(Boolean),
        trailerUrl: w.trailerUrl.trim() || null,
        screenshotUrls: w.screenshotUrls.filter(Boolean),
        status,
      };
      const res = await apiRequest("POST", `/api/games/${w.gameId}/bounties`, payload);
      return res.json();
    },
    onSuccess: (_data, status) => {
      toast({
        title: status === "draft" ? "Draft saved" : "Bounty launched!",
        description: status === "draft" ? "Your bounty was saved as a draft." : "Your bounty is now live for creators.",
        variant: "gamefolioSuccess" as any,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/games/indie/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games/indie/bounties"] });
      setW(initialState);
      setStep(0);
      onCreated();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to create bounty", variant: "gamefolioError" as any });
    },
  });

  const canProceedFromBasics = w.gameId && w.title.trim().length > 0;

  return (
    <div className="rounded-2xl p-5 sm:p-6" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => i <= step && setStep(i)}
            className="text-[11px] font-bold px-2.5 py-1.5 rounded-full whitespace-nowrap"
            style={{
              background: i === step ? "rgba(193,255,0,0.2)" : i < step ? "rgba(193,255,0,0.08)" : "rgba(255,255,255,0.06)",
              color: i === step ? NEON : i < step ? "rgba(193,255,0,0.6)" : "rgba(255,255,255,0.4)",
              cursor: i <= step ? "pointer" : "default",
            }}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <GamePicker value={w} onSelect={(id, name) => { set("gameId", id || null); set("gameName", name); }} />
          <div><label style={labelStyle}>Bounty Title *</label>
            <input style={inputStyle} value={w.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Launch Week Clip Challenge" />
          </div>
          <div><label style={labelStyle}>Display Name (optional)</label>
            <input style={inputStyle} value={w.campaignTitle} onChange={(e) => set("campaignTitle", e.target.value)} placeholder="e.g. Creator Week One Challenge" />
          </div>
          <div><label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} value={w.description} onChange={(e) => set("description", e.target.value)} placeholder="What should creators do to earn rewards?" />
          </div>
          <div>
            <label style={labelStyle}>Bounty Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BOUNTY_TYPES.map((bt) => (
                <button
                  key={bt.id}
                  type="button"
                  onClick={() => set("bountyType", bt.id)}
                  className="rounded-xl p-3 text-left transition-colors"
                  style={{
                    background: w.bountyType === bt.id ? "rgba(193,255,0,0.1)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${w.bountyType === bt.id ? "rgba(193,255,0,0.4)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <bt.icon className="w-4 h-4 mb-1.5" style={{ color: w.bountyType === bt.id ? NEON : "#9ca3af" }} />
                  <div className="text-xs font-bold text-white">{bt.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{bt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <TrailerUpload value={w.trailerUrl} onChange={(url) => set("trailerUrl", url)} />
          <ScreenshotsUpload values={w.screenshotUrls} onChange={(urls) => set("screenshotUrls", urls)} />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label style={labelStyle}>Required Clips</label><input style={inputStyle} type="number" min="0" value={w.requiredClips} onChange={(e) => set("requiredClips", e.target.value)} /></div>
            <div><label style={labelStyle}>Required Reels</label><input style={inputStyle} type="number" min="0" value={w.requiredReels} onChange={(e) => set("requiredReels", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={labelStyle}>Required Screenshots</label><input style={inputStyle} type="number" min="0" value={w.requiredScreenshots} onChange={(e) => set("requiredScreenshots", e.target.value)} /></div>
            <div><label style={labelStyle}>Views Milestone</label><input style={inputStyle} type="number" min="0" value={w.requiredViews} onChange={(e) => set("requiredViews", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={labelStyle}>Min Clip Length (sec)</label><input style={inputStyle} type="number" min="0" value={w.minClipLength} onChange={(e) => set("minClipLength", e.target.value)} /></div>
            <div><label style={labelStyle}>Max Submissions / User</label><input style={inputStyle} type="number" min="1" value={w.maxSubmissionsPerUser} onChange={(e) => set("maxSubmissionsPerUser", e.target.value)} /></div>
          </div>
          <div><label style={labelStyle}>Required Tag (optional)</label><input style={inputStyle} value={w.requiredTag} onChange={(e) => set("requiredTag", e.target.value)} placeholder="e.g. #SponsoredByUs" /></div>
          <div><label style={labelStyle}>Required Keywords (optional)</label><input style={inputStyle} value={w.requiredKeywords} onChange={(e) => set("requiredKeywords", e.target.value)} placeholder="Comma-separated keywords the caption must include" /></div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div><label style={labelStyle}>Join XP</label><input style={inputStyle} type="number" min="0" value={w.xpJoin} onChange={(e) => set("xpJoin", e.target.value)} /></div>
            <div><label style={labelStyle}>Per Clip XP</label><input style={inputStyle} type="number" min="0" value={w.xpPerClip} onChange={(e) => set("xpPerClip", e.target.value)} /></div>
            <div><label style={labelStyle}>Per Reel XP</label><input style={inputStyle} type="number" min="0" value={w.xpPerReel} onChange={(e) => set("xpPerReel", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label style={labelStyle}>Per Screenshot XP</label><input style={inputStyle} type="number" min="0" value={w.xpPerScreenshot} onChange={(e) => set("xpPerScreenshot", e.target.value)} /></div>
            <div><label style={labelStyle}>View Milestone XP</label><input style={inputStyle} type="number" min="0" value={w.xpViewMilestone} onChange={(e) => set("xpViewMilestone", e.target.value)} /></div>
            <div><label style={labelStyle}>Completion Bonus</label><input style={inputStyle} type="number" min="0" value={w.xpCompletionBonus} onChange={(e) => set("xpCompletionBonus", e.target.value)} /></div>
          </div>
          <div><label style={labelStyle}>Completion Badge Name (optional)</label><input style={inputStyle} value={w.completionBadge} onChange={(e) => set("completionBadge", e.target.value)} placeholder="e.g. Early Supporter" /></div>
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(193,255,0,0.06)", border: "1px solid rgba(193,255,0,0.15)" }}>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total XP Available</div>
            <div className="text-xl font-black" style={{ color: NEON }}>{totalXp.toLocaleString()} XP</div>
          </div>
          <div><label style={labelStyle}>Demo Keys (one per line)</label>
            <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={w.demoKeyPool} onChange={(e) => set("demoKeyPool", e.target.value)} placeholder={"ABC-123-DEF\nGHI-456-JKL"} />
            <div className="text-xs text-gray-500 mt-1">{demoKeyCount} demo keys available</div>
          </div>
          <div><label style={labelStyle}>Full Keys (one per line)</label>
            <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={w.fullKeyPool} onChange={(e) => set("fullKeyPool", e.target.value)} placeholder={"FULL-KEY-001\nFULL-KEY-002"} />
            <div className="text-xs text-gray-500 mt-1">{fullKeyCount} full keys available</div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label style={labelStyle}>Creator Slots</label><input style={inputStyle} type="number" min="1" value={w.maxParticipants} onChange={(e) => set("maxParticipants", e.target.value)} /></div>
            <div><label style={labelStyle}>Region Restriction (optional)</label><input style={inputStyle} value={w.regionRestriction} onChange={(e) => set("regionRestriction", e.target.value)} placeholder="e.g. US, EU" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={labelStyle}>Start Date (optional)</label><input style={inputStyle} type="date" value={w.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
            <div><label style={labelStyle}>End Date (optional)</label><input style={inputStyle} type="date" value={w.endDate} onChange={(e) => set("endDate", e.target.value)} /></div>
          </div>
          <div><label style={labelStyle}>Hashtags (optional)</label><input style={inputStyle} value={w.hashtags} onChange={(e) => set("hashtags", e.target.value)} placeholder="#MyGame, #Launch2026" /></div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <label className="flex items-center gap-3 rounded-xl p-3 cursor-pointer" style={{ background: "rgba(255,255,255,0.03)" }}>
            <input type="checkbox" checked={w.manualApprovalRequired} onChange={(e) => set("manualApprovalRequired", e.target.checked)} className="w-4 h-4" />
            <div>
              <div className="text-sm font-semibold text-white">Require manual approval</div>
              <div className="text-xs text-gray-500">Review each submission before rewards are released</div>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-xl p-3 cursor-pointer" style={{ background: "rgba(255,255,255,0.03)" }}>
            <input type="checkbox" checked={w.mustBePublic} onChange={(e) => set("mustBePublic", e.target.checked)} className="w-4 h-4" />
            <div>
              <div className="text-sm font-semibold text-white">Content must be public</div>
              <div className="text-xs text-gray-500">Private/unlisted submissions will be rejected</div>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-xl p-3 cursor-pointer" style={{ background: "rgba(255,255,255,0.03)" }}>
            <input type="checkbox" checked={w.blockDuplicates} onChange={(e) => set("blockDuplicates", e.target.checked)} className="w-4 h-4" />
            <div>
              <div className="text-sm font-semibold text-white">Block duplicate submissions</div>
              <div className="text-xs text-gray-500">Same clip/screenshot can't be submitted twice</div>
            </div>
          </label>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="text-sm font-bold text-white mb-3">{w.title || "Untitled Bounty"}</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
              <div>Game: <span className="text-white">{w.gameName || "—"}</span></div>
              <div>Type: <span className="text-white">{BOUNTY_TYPES.find((b) => b.id === w.bountyType)?.label}</span></div>
              <div>Creator Slots: <span className="text-white">{w.maxParticipants}</span></div>
              <div>Total XP: <span style={{ color: NEON }}>{totalXp.toLocaleString()}</span></div>
              <div>Demo Keys: <span className="text-white">{demoKeyCount}</span></div>
              <div>Full Keys: <span className="text-white">{fullKeyCount}</span></div>
              <div>Manual Approval: <span className="text-white">{w.manualApprovalRequired ? "Yes" : "No"}</span></div>
              <div>Ends: <span className="text-white">{w.endDate || "No end date"}</span></div>
            </div>
          </div>
          {!w.gameId && <p className="text-xs text-red-400">Select a game in step 1 before publishing.</p>}
        </div>
      )}

      <div className="flex items-center gap-3 pt-6">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="text-sm font-bold text-gray-400 px-3 py-2">
            Back
          </button>
        )}
        <div className="flex-1" />
        {step === 5 ? (
          <>
            <button
              type="button"
              disabled={mutation.isPending || !w.gameId || !w.title.trim()}
              onClick={() => mutation.mutate("draft")}
              className="text-sm font-bold px-4 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={mutation.isPending || !w.gameId || !w.title.trim()}
              onClick={() => mutation.mutate("active")}
              className="text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2"
              style={{ background: NEON, color: "#0a0f1c", boxShadow: "0 8px 24px rgba(193,255,0,0.25)" }}
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Publish Bounty
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={step === 0 && !canProceedFromBasics}
            onClick={() => setStep((s) => s + 1)}
            className="text-sm font-bold px-4 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
