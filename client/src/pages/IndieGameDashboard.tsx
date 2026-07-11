import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Gamepad2, Upload, Image as ImageIcon, Video, Globe, Twitter, MessageSquare,
  ExternalLink, Save, RefreshCw, ChevronRight, X, Plus, CheckCircle2,
  Layers, Info, BookText, Store, Link2, ArrowLeft, Sparkles, Loader2,
  SlidersHorizontal, Camera, Film, Tag, Users, Calendar, DollarSign,
  Monitor, Smartphone, Cpu,
} from "lucide-react";
import { SiSteam, SiEpicgames, SiItchdotio } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const NEON = "#B7FF18";
const BG = "#0B1319";
const CARD = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

const cardStyle = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px" };
const neonStyle = { background: "rgba(183,255,24,0.1)", border: `1px solid rgba(183,255,24,0.25)`, color: NEON };

const TABS = [
  { id: "overview",      label: "Overview",      icon: Gamepad2 },
  { id: "game-info",     label: "Game Info",      icon: Info },
  { id: "studio",        label: "Studio",         icon: Users },
  { id: "descriptions",  label: "Descriptions",   icon: BookText },
  { id: "media",         label: "Media",          icon: ImageIcon },
  { id: "store",         label: "Store Links",    icon: Store },
  { id: "social",        label: "Social",         icon: Link2 },
  { id: "import",        label: "Import",         icon: RefreshCw },
];

const PLATFORMS = ["windows", "mac", "linux", "ps5", "xbox", "switch", "ios", "android"];
const PLATFORM_ICONS: Record<string, any> = {
  windows: Monitor, mac: Monitor, linux: Monitor,
  ps5: Cpu, xbox: Cpu, switch: Cpu, ios: Smartphone, android: Smartphone,
};
const RELEASE_STATUSES = ["coming_soon", "early_access", "released"];

type IndieProfile = Record<string, any>;
type FieldMeta = Record<string, { isManualOverride: boolean; importedValue?: string; importSource?: string; lastEditedAt?: string }>;

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div style={cardStyle} className="p-6">
      <div className="flex items-center gap-2 mb-5">
        <Icon size={16} style={{ color: NEON }} />
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/70">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput("");
    }
  };
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? "Type and press Enter…"}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-8"
        />
        <Button size="sm" variant="ghost" onClick={add} className="h-8 px-3 text-white/60 hover:text-white border border-white/10">
          <Plus size={14} />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={neonStyle}>
            {tag}
            <button onClick={() => onChange(value.filter(t => t !== tag))} className="opacity-60 hover:opacity-100">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function UploadZone({ onFile, accept, label, preview }: { onFile: (f: File) => void; accept: string; label: string; preview?: string | null }) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);
  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-pointer transition-all"
      style={{ border: `2px dashed ${drag ? NEON : "rgba(255,255,255,0.15)"}`, minHeight: "120px" }}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
      {preview ? (
        <img src={preview} alt="" className="w-full h-full object-cover absolute inset-0" />
      ) : null}
      <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity ${preview ? "opacity-0 hover:opacity-100 bg-black/50" : ""}`}>
        <Upload size={20} style={{ color: NEON }} />
        <span className="text-xs font-semibold text-white/70">{label}</span>
      </div>
    </div>
  );
}

export default function IndieGameDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery<{ profile: IndieProfile; fieldMeta: FieldMeta }>({
    queryKey: ["/api/indie/profile"],
    enabled: !!user,
  });

  const profile = data?.profile ?? {};

  // Local editable state — mirrors the profile, populated on load
  const [form, setForm] = useState<IndieProfile>({});
  const [initialized, setInitialized] = useState(false);
  if (!initialized && data?.profile) {
    setForm({ ...data.profile });
    setInitialized(true);
  }

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  // Save a section (only sends fields in the current form vs profile diff)
  const saveSection = async (fields: string[]) => {
    const patch: Record<string, any> = {};
    for (const f of fields) {
      if (f in form) patch[f] = form[f];
    }
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/indie/profile", patch);
      qc.invalidateQueries({ queryKey: ["/api/indie/profile"] });
      toast({ title: "Saved!", description: "Your changes are live." });
    } catch {
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Image upload mutations
  const uploadImage = useMutation({
    mutationFn: async ({ file, field }: { file: File; field: 'header' | 'capsule' }) => {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("field", field);
      const res = await fetch("/api/indie/upload/image", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: (data) => {
      set(data.field, data.url);
      qc.invalidateQueries({ queryKey: ["/api/indie/profile"] });
      toast({ title: "Image uploaded!" });
    },
    onError: () => toast({ title: "Upload failed", variant: "destructive" }),
  });

  const uploadScreenshot = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("screenshot", file);
      const res = await fetch("/api/indie/upload/screenshot", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: (data) => {
      set("screenshotUrls", data.screenshotUrls);
      qc.invalidateQueries({ queryKey: ["/api/indie/profile"] });
      toast({ title: "Screenshot uploaded!" });
    },
    onError: () => toast({ title: "Upload failed", variant: "destructive" }),
  });

  const deleteScreenshot = useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch("/api/indie/screenshot", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: (data) => {
      set("screenshotUrls", data.screenshotUrls);
      qc.invalidateQueries({ queryKey: ["/api/indie/profile"] });
    },
    onError: () => toast({ title: "Remove failed", variant: "destructive" }),
  });

  // Steam import
  const [steamPreviewAppId, setSteamPreviewAppId] = useState(form.steamAppId ?? "");
  const [steamPreviewData, setSteamPreviewData] = useState<any>(null);
  const [steamPreviewLoading, setSteamPreviewLoading] = useState(false);
  const [steamSelectedFields, setSteamSelectedFields] = useState<Set<string>>(new Set());

  const fetchSteamPreview = async () => {
    const appId = steamPreviewAppId.trim().replace(/\D/g, "");
    if (!appId) return;
    setSteamPreviewLoading(true);
    try {
      const res = await fetch(`/api/indie/steam/preview?appId=${appId}`, { credentials: "include" });
      const data = await res.json();
      setSteamPreviewData(data);
      setSteamSelectedFields(new Set(Object.keys(data.fields ?? {}).filter(k => data.fields[k] != null)));
    } catch {
      toast({ title: "Steam preview failed", variant: "destructive" });
    } finally {
      setSteamPreviewLoading(false);
    }
  };

  const importFromSteam = async () => {
    if (!steamPreviewData) return;
    const fields: Record<string, any> = {};
    for (const f of Array.from(steamSelectedFields)) {
      if (steamPreviewData.fields[f] != null) fields[f] = steamPreviewData.fields[f];
    }
    if (steamPreviewData.appId) { fields.steamAppId = steamPreviewData.appId; fields.steamUrl = steamPreviewData.steamUrl; }
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/indie/profile", fields);
      setForm(f => ({ ...f, ...fields }));
      qc.invalidateQueries({ queryKey: ["/api/indie/profile"] });
      toast({ title: "Imported from Steam!", description: `${Object.keys(fields).length} fields updated.` });
      setSteamPreviewData(null);
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}><p className="text-white/50">Please log in.</p></div>;

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: BG }}>
        <div className="max-w-5xl mx-auto px-6 pt-10 space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
            {TABS.map(t => <Skeleton key={t.id} className="h-9 w-24 rounded-full" />)}
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const screens: string[] = Array.isArray(form.screenshotUrls) ? form.screenshotUrls : [];

  return (
    <div className="min-h-screen pb-24" style={{ background: BG, color: "#fff" }}>

      {/* Header */}
      <div className="border-b border-white/8" style={{ background: "rgba(11,19,25,0.95)" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href={`/studio/${user.username}`}
            className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors">
            <ArrowLeft size={15} /> Studio Profile
          </Link>
          <ChevronRight size={14} className="text-white/20" />
          <div className="flex items-center gap-2">
            <Gamepad2 size={18} style={{ color: NEON }} />
            <span className="font-bold text-white">Game Dashboard</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a href={`/studio/${user.username}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-white transition-colors">
              <ExternalLink size={13} /> View Public Page
            </a>
          </div>
        </div>
      </div>

      {/* Game header strip */}
      {form.headerImageUrl && (
        <div className="relative h-40 overflow-hidden">
          <img src={form.headerImageUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(11,19,25,1))" }} />
          <div className="absolute bottom-4 left-6 flex items-end gap-3">
            {form.capsuleImageUrl && (
              <img src={form.capsuleImageUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-white/20 shadow-lg" />
            )}
            <div>
              <div className="text-xl font-black text-white" style={{ textShadow: "0 0 20px rgba(0,0,0,0.8)" }}>
                {form.gameName || "Unnamed Game"}
              </div>
              <div className="text-xs font-semibold text-white/50">{form.releaseStatus?.replace("_", " ") ?? "coming soon"}</div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Tab nav */}
        <div className="flex gap-0.5 overflow-x-auto scrollbar-none py-4">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all"
                style={active ? { background: "rgba(183,255,24,0.12)", color: NEON, border: "1px solid rgba(183,255,24,0.3)" }
                  : { background: "transparent", color: "rgba(255,255,255,0.45)", border: "1px solid transparent" }}>
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Game Name", value: form.gameName ?? "—" },
                { label: "Status", value: (form.releaseStatus ?? "—").replace("_", " ") },
                { label: "Price", value: form.isFree ? "Free" : (form.price ?? "—") },
                { label: "Studio", value: form.studioName ?? "—" },
              ].map(stat => (
                <div key={stat.label} style={cardStyle} className="p-4">
                  <div className="text-xs uppercase tracking-wider mb-1 text-white/40">{stat.label}</div>
                  <div className="text-sm font-bold text-white truncate">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Media preview strip */}
            {screens.length > 0 && (
              <div style={cardStyle} className="p-4">
                <div className="text-xs uppercase tracking-wider mb-3 text-white/40">Screenshots</div>
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                  {screens.map((url, i) => (
                    <img key={i} src={url} alt="" className="h-24 w-40 object-cover rounded-md flex-shrink-0 border border-white/10" />
                  ))}
                </div>
              </div>
            )}

            {/* Quick-access links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onClick={() => setActiveTab("media")} style={cardStyle}
                className="p-4 text-left hover:bg-white/5 transition-colors rounded-xl">
                <Camera size={18} style={{ color: NEON }} className="mb-2" />
                <div className="text-sm font-bold text-white">Upload Media</div>
                <div className="text-xs text-white/40 mt-0.5">Header, capsule, screenshots</div>
              </button>
              <button onClick={() => setActiveTab("import")} style={cardStyle}
                className="p-4 text-left hover:bg-white/5 transition-colors rounded-xl">
                <SiSteam size={18} className="mb-2 text-[#66c0f4]" />
                <div className="text-sm font-bold text-white">Import from Steam</div>
                <div className="text-xs text-white/40 mt-0.5">Pull game data automatically</div>
              </button>
              <button onClick={() => setActiveTab("game-info")} style={cardStyle}
                className="p-4 text-left hover:bg-white/5 transition-colors rounded-xl">
                <SlidersHorizontal size={18} style={{ color: NEON }} className="mb-2" />
                <div className="text-sm font-bold text-white">Edit Game Info</div>
                <div className="text-xs text-white/40 mt-0.5">Name, genres, platforms…</div>
              </button>
            </div>
          </div>
        )}

        {/* ── GAME INFO ── */}
        {activeTab === "game-info" && (
          <div className="space-y-4">
            <SectionCard title="Basic Info" icon={Info}>
              <div className="space-y-4">
                <FieldRow label="Game Name">
                  <Input value={form.gameName ?? ""} onChange={e => set("gameName", e.target.value)}
                    placeholder="My Awesome Game"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </FieldRow>

                <FieldRow label="Release Status">
                  <Select value={form.releaseStatus ?? "coming_soon"} onValueChange={v => set("releaseStatus", v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0d1a22] border-white/10 text-white">
                      {RELEASE_STATUSES.map(s => (
                        <SelectItem key={s} value={s} className="text-white hover:bg-white/10">
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>

                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Release Date">
                    <Input value={form.releaseDate ?? ""} onChange={e => set("releaseDate", e.target.value)}
                      placeholder="Q4 2025 / Jan 2026"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </FieldRow>
                  <FieldRow label="Price">
                    <Input value={form.price ?? ""} onChange={e => set("price", e.target.value)}
                      placeholder="$19.99" disabled={!!form.isFree}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 disabled:opacity-40" />
                  </FieldRow>
                </div>

                <div className="flex items-center gap-3">
                  <Switch checked={!!form.isFree} onCheckedChange={v => set("isFree", v)} id="isFree" />
                  <Label htmlFor="isFree" className="text-sm text-white/70">Free to play</Label>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Genres & Tags" icon={Tag}>
              <div className="space-y-4">
                <FieldRow label="Genres">
                  <TagInput value={Array.isArray(form.genres) ? form.genres : []} onChange={v => set("genres", v)} placeholder="Action, RPG, Roguelite…" />
                </FieldRow>
                <FieldRow label="Tags">
                  <TagInput value={Array.isArray(form.tags) ? form.tags : []} onChange={v => set("tags", v)} placeholder="Co-op, Open World, Sandbox…" />
                </FieldRow>
                <FieldRow label="Key Features">
                  <TagInput value={Array.isArray(form.keyFeatures) ? form.keyFeatures : []} onChange={v => set("keyFeatures", v)} placeholder="Procedurally generated…" />
                </FieldRow>
              </div>
            </SectionCard>

            <SectionCard title="Platforms" icon={Monitor}>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => {
                  const active = (form.platforms ?? []).includes(p);
                  return (
                    <button key={p}
                      onClick={() => {
                        const cur: string[] = Array.isArray(form.platforms) ? form.platforms : [];
                        set("platforms", active ? cur.filter(x => x !== p) : [...cur, p]);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
                      style={active ? neonStyle : { background: CARD, border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.5)" }}>
                      {p}
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Age Rating" icon={Info}>
              <FieldRow label="Age Rating">
                <Input value={form.ageRating ?? ""} onChange={e => set("ageRating", e.target.value)}
                  placeholder="PEGI 16, E10+, Mature 17+…"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 max-w-xs" />
              </FieldRow>
            </SectionCard>

            <div className="flex justify-end pt-2">
              <Button onClick={() => saveSection(["gameName","releaseStatus","releaseDate","price","isFree","genres","tags","keyFeatures","platforms","ageRating"])}
                disabled={saving} style={{ background: NEON, color: "#000" }} className="font-bold">
                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={15} className="mr-2" />}
                Save Game Info
              </Button>
            </div>
          </div>
        )}

        {/* ── STUDIO ── */}
        {activeTab === "studio" && (
          <div className="space-y-4">
            <SectionCard title="Studio Details" icon={Users}>
              <div className="space-y-4">
                <FieldRow label="Studio Name">
                  <Input value={form.studioName ?? ""} onChange={e => set("studioName", e.target.value)}
                    placeholder="Midnight Forge Studios"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </FieldRow>
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Founded Year">
                    <Input value={form.studioFoundedYear ?? ""} onChange={e => set("studioFoundedYear", e.target.value)}
                      placeholder="2019"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </FieldRow>
                  <FieldRow label="Team Size">
                    <Input value={form.studioTeamSize ?? ""} onChange={e => set("studioTeamSize", e.target.value)}
                      placeholder="Solo / 2-5 / 10+"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </FieldRow>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Country">
                    <Input value={form.studioCountry ?? ""} onChange={e => set("studioCountry", e.target.value)}
                      placeholder="United Kingdom"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </FieldRow>
                  <FieldRow label="Studio Website">
                    <Input value={form.studioWebsite ?? ""} onChange={e => set("studioWebsite", e.target.value)}
                      placeholder="https://mystudio.com"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </FieldRow>
                </div>
              </div>
            </SectionCard>
            <div className="flex justify-end pt-2">
              <Button onClick={() => saveSection(["studioName","studioFoundedYear","studioTeamSize","studioCountry","studioWebsite"])}
                disabled={saving} style={{ background: NEON, color: "#000" }} className="font-bold">
                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={15} className="mr-2" />}
                Save Studio Info
              </Button>
            </div>
          </div>
        )}

        {/* ── DESCRIPTIONS ── */}
        {activeTab === "descriptions" && (
          <div className="space-y-4">
            <SectionCard title="Game Descriptions" icon={BookText}>
              <div className="space-y-5">
                <FieldRow label="Short Description (shown in cards, ~150 chars)">
                  <Textarea value={form.shortDescription ?? ""} onChange={e => set("shortDescription", e.target.value)}
                    placeholder="A brutal roguelite dungeon crawler where every death teaches you something…"
                    rows={3}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none" />
                  <div className="text-right text-xs text-white/30 mt-1">{(form.shortDescription ?? "").length} chars</div>
                </FieldRow>
                <FieldRow label="Full Description (shown on studio profile)">
                  <Textarea value={form.fullDescription ?? ""} onChange={e => set("fullDescription", e.target.value)}
                    placeholder="Describe your game in detail — features, story, mechanics, what makes it unique…"
                    rows={10}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none" />
                  <div className="text-right text-xs text-white/30 mt-1">{(form.fullDescription ?? "").length} / 5000 chars</div>
                </FieldRow>
              </div>
            </SectionCard>
            <div className="flex justify-end pt-2">
              <Button onClick={() => saveSection(["shortDescription","fullDescription"])}
                disabled={saving} style={{ background: NEON, color: "#000" }} className="font-bold">
                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={15} className="mr-2" />}
                Save Descriptions
              </Button>
            </div>
          </div>
        )}

        {/* ── MEDIA ── */}
        {activeTab === "media" && (
          <div className="space-y-4">
            <SectionCard title="Header Image" icon={ImageIcon}>
              <p className="text-xs text-white/40 mb-3">Main banner shown at the top of your studio profile. Recommended: 1920×620</p>
              <div className="h-44">
                <UploadZone
                  accept="image/*"
                  label="Click or drag to upload header image"
                  preview={form.headerImageUrl ?? null}
                  onFile={f => uploadImage.mutate({ file: f, field: 'header' })}
                />
              </div>
              {uploadImage.isPending && <div className="flex items-center gap-2 mt-2 text-xs text-white/50"><Loader2 size={13} className="animate-spin" /> Uploading…</div>}
              <div className="mt-3">
                <FieldRow label="Or paste an image URL">
                  <div className="flex gap-2">
                    <Input value={form.headerImageUrl ?? ""} onChange={e => set("headerImageUrl", e.target.value)}
                      placeholder="https://…"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm" />
                    <Button variant="ghost" size="sm" onClick={() => saveSection(["headerImageUrl"])}
                      className="border border-white/10 text-white/60 hover:text-white shrink-0">Save</Button>
                  </div>
                </FieldRow>
              </div>
            </SectionCard>

            <SectionCard title="Capsule Image" icon={ImageIcon}>
              <p className="text-xs text-white/40 mb-3">Square icon shown in listings. Recommended: 600×600</p>
              <div className="h-44 max-w-[220px]">
                <UploadZone
                  accept="image/*"
                  label="Click or drag to upload capsule"
                  preview={form.capsuleImageUrl ?? null}
                  onFile={f => uploadImage.mutate({ file: f, field: 'capsule' })}
                />
              </div>
              <div className="mt-3">
                <FieldRow label="Or paste a URL">
                  <div className="flex gap-2">
                    <Input value={form.capsuleImageUrl ?? ""} onChange={e => set("capsuleImageUrl", e.target.value)}
                      placeholder="https://…"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm" />
                    <Button variant="ghost" size="sm" onClick={() => saveSection(["capsuleImageUrl"])}
                      className="border border-white/10 text-white/60 hover:text-white shrink-0">Save</Button>
                  </div>
                </FieldRow>
              </div>
            </SectionCard>

            <SectionCard title="Trailer / Video" icon={Film}>
              <p className="text-xs text-white/40 mb-3">Paste a direct MP4 URL or a YouTube/Vimeo embed URL. Shown prominently on your studio profile.</p>
              <FieldRow label="Trailer URL">
                <div className="flex gap-2">
                  <Input value={form.trailerUrl ?? ""} onChange={e => set("trailerUrl", e.target.value)}
                    placeholder="https://youtube.com/watch?v=… or direct .mp4 URL"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  <Button variant="ghost" size="sm" onClick={() => saveSection(["trailerUrl"])}
                    className="border border-white/10 text-white/60 hover:text-white shrink-0">Save</Button>
                </div>
              </FieldRow>
              {form.trailerUrl && (
                <div className="mt-3 aspect-video rounded-lg overflow-hidden bg-black/40">
                  <video src={form.trailerUrl} controls className="w-full h-full" style={{ display: form.trailerUrl.includes("youtube") || form.trailerUrl.includes("vimeo") ? "none" : "block" }} />
                  {(form.trailerUrl.includes("youtube") || form.trailerUrl.includes("vimeo")) && (
                    <div className="flex items-center justify-center h-full text-white/40 text-sm gap-2">
                      <Film size={20} />
                      YouTube / Vimeo links open in player on your public page
                    </div>
                  )}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Screenshots" icon={Camera}>
              <p className="text-xs text-white/40 mb-4">Upload up to 20 in-game screenshots. Drag-and-drop supported. Recommended: 1920×1080</p>

              {/* Upload zone */}
              <div
                className="rounded-lg border-2 border-dashed border-white/15 hover:border-white/30 transition-colors cursor-pointer flex items-center justify-center gap-3 py-6 mb-4"
                onClick={() => {
                  const inp = document.createElement("input");
                  inp.type = "file"; inp.accept = "image/*"; inp.multiple = true;
                  inp.onchange = async (e: any) => {
                    const files: File[] = Array.from(e.target.files ?? []);
                    for (const f of files.slice(0, 20 - screens.length)) {
                      await uploadScreenshot.mutateAsync(f);
                    }
                  };
                  inp.click();
                }}
                onDragOver={e => e.preventDefault()}
                onDrop={async e => {
                  e.preventDefault();
                  const files: File[] = Array.from(e.dataTransfer.files);
                  for (const f of files.slice(0, 20 - screens.length)) {
                    await uploadScreenshot.mutateAsync(f);
                  }
                }}
              >
                {uploadScreenshot.isPending ? (
                  <><Loader2 size={20} className="animate-spin" style={{ color: NEON }} /><span className="text-sm text-white/60">Uploading…</span></>
                ) : (
                  <><Upload size={20} style={{ color: NEON }} /><span className="text-sm text-white/60">Click or drag images to upload</span><span className="text-xs text-white/30">({screens.length}/20)</span></>
                )}
              </div>

              {/* Screenshot grid */}
              {screens.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {screens.map((url, i) => (
                    <div key={url} className="group relative aspect-video rounded-lg overflow-hidden border border-white/10">
                      <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => deleteScreenshot.mutate(url)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-xs font-semibold transition-colors">
                          <X size={12} /> Remove
                        </button>
                      </div>
                      <span className="absolute top-1.5 left-1.5 text-xs bg-black/60 px-1.5 py-0.5 rounded font-semibold text-white/60">#{i + 1}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-white/30 text-sm py-4">No screenshots yet — upload some above.</p>
              )}
            </SectionCard>
          </div>
        )}

        {/* ── STORE LINKS ── */}
        {activeTab === "store" && (
          <div className="space-y-4">
            <SectionCard title="Steam" icon={SiSteam as any}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Steam App ID">
                    <Input value={form.steamAppId ?? ""} onChange={e => set("steamAppId", e.target.value)}
                      placeholder="1234567"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </FieldRow>
                  <FieldRow label="Steam Store URL">
                    <Input value={form.steamUrl ?? ""} onChange={e => set("steamUrl", e.target.value)}
                      placeholder="https://store.steampowered.com/app/…"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </FieldRow>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Epic Games" icon={SiEpicgames as any}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Epic Games URL">
                    <Input value={form.epicUrl ?? ""} onChange={e => set("epicUrl", e.target.value)}
                      placeholder="https://store.epicgames.com/…"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </FieldRow>
                  <FieldRow label="Epic Slug">
                    <Input value={form.epicSlug ?? ""} onChange={e => set("epicSlug", e.target.value)}
                      placeholder="my-awesome-game"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </FieldRow>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="itch.io" icon={SiItchdotio as any}>
              <FieldRow label="itch.io URL">
                <Input value={form.itchUrl ?? ""} onChange={e => set("itchUrl", e.target.value)}
                  placeholder="https://yourname.itch.io/game"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </FieldRow>
            </SectionCard>

            <div className="flex justify-end pt-2">
              <Button onClick={() => saveSection(["steamAppId","steamUrl","epicUrl","epicSlug","itchUrl"])}
                disabled={saving} style={{ background: NEON, color: "#000" }} className="font-bold">
                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={15} className="mr-2" />}
                Save Store Links
              </Button>
            </div>
          </div>
        )}

        {/* ── SOCIAL ── */}
        {activeTab === "social" && (
          <div className="space-y-4">
            <SectionCard title="Social & Contact" icon={Link2}>
              <div className="space-y-4">
                <FieldRow label="Game / Studio Website">
                  <div className="flex items-center gap-2">
                    <Globe size={15} className="text-white/40 shrink-0" />
                    <Input value={form.websiteUrl ?? ""} onChange={e => set("websiteUrl", e.target.value)}
                      placeholder="https://mygame.com"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>
                </FieldRow>
                <FieldRow label="Twitter / X">
                  <div className="flex items-center gap-2">
                    <Twitter size={15} className="text-white/40 shrink-0" />
                    <Input value={form.twitterUrl ?? ""} onChange={e => set("twitterUrl", e.target.value)}
                      placeholder="https://twitter.com/…"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>
                </FieldRow>
                <FieldRow label="Discord Server">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={15} className="text-white/40 shrink-0" />
                    <Input value={form.discordUrl ?? ""} onChange={e => set("discordUrl", e.target.value)}
                      placeholder="https://discord.gg/…"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>
                </FieldRow>
              </div>
            </SectionCard>
            <div className="flex justify-end pt-2">
              <Button onClick={() => saveSection(["websiteUrl","twitterUrl","discordUrl"])}
                disabled={saving} style={{ background: NEON, color: "#000" }} className="font-bold">
                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={15} className="mr-2" />}
                Save Social Links
              </Button>
            </div>
          </div>
        )}

        {/* ── IMPORT ── */}
        {activeTab === "import" && (
          <div className="space-y-4">
            <SectionCard title="Import from Steam" icon={SiSteam as any}>
              <p className="text-sm text-white/50 mb-4">
                Enter your Steam App ID to preview and pull game data directly into your profile. You can pick which fields to import.
              </p>
              <div className="flex gap-2 mb-4">
                <Input
                  value={steamPreviewAppId}
                  onChange={e => setSteamPreviewAppId(e.target.value)}
                  placeholder="Steam App ID (e.g. 1234567)"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 max-w-xs" />
                <Button onClick={fetchSteamPreview} disabled={steamPreviewLoading || !steamPreviewAppId.trim()}
                  className="bg-[#66c0f4] text-black font-bold hover:bg-[#66c0f4]/90">
                  {steamPreviewLoading ? <Loader2 size={15} className="animate-spin mr-1" /> : <SiSteam size={15} className="mr-1" />}
                  Preview
                </Button>
              </div>

              {steamPreviewData && (
                <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", padding: "16px" }}>
                  <div className="flex items-center gap-3 mb-4">
                    {steamPreviewData.headerImageUrl && <img src={steamPreviewData.headerImageUrl} alt="" className="h-14 w-24 object-cover rounded-md" />}
                    <div>
                      <div className="font-bold text-white">{steamPreviewData.name}</div>
                      <div className="text-xs text-white/40">App ID: {steamPreviewData.appId}</div>
                    </div>
                  </div>

                  <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Select fields to import</div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {Object.entries(steamPreviewData.fields ?? {}).map(([key, val]: [string, any]) => {
                      if (val == null) return null;
                      const selected = steamSelectedFields.has(key);
                      const display = Array.isArray(val) ? val.join(", ") : String(val).slice(0, 100);
                      return (
                        <label key={key}
                          className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors"
                          style={{ background: selected ? "rgba(183,255,24,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${selected ? "rgba(183,255,24,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                          <input type="checkbox" checked={selected}
                            onChange={e => {
                              const s = new Set(steamSelectedFields);
                              if (e.target.checked) s.add(key); else s.delete(key);
                              setSteamSelectedFields(s);
                            }}
                            className="mt-0.5 accent-[#B7FF18]" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white/70">{key}</div>
                            <div className="text-xs text-white/40 truncate">{display}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                    <span className="text-xs text-white/40">{steamSelectedFields.size} fields selected</span>
                    <Button onClick={importFromSteam} disabled={saving || steamSelectedFields.size === 0}
                      style={{ background: NEON, color: "#000" }} className="font-bold">
                      {saving ? <Loader2 size={15} className="animate-spin mr-1" /> : <CheckCircle2 size={15} className="mr-1" />}
                      Import Selected
                    </Button>
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Epic Games / itch.io" icon={Store}>
              <p className="text-sm text-white/50">
                Epic Games and itch.io imports are handled via the store links you set in the{" "}
                <button onClick={() => setActiveTab("store")} className="underline" style={{ color: NEON }}>Store Links</button>{" "}
                tab. Once you set your Epic slug or itch.io API key, live sync will be available here.
              </p>
            </SectionCard>
          </div>
        )}

      </div>
    </div>
  );
}
