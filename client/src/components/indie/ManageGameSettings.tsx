import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, Upload, ExternalLink, CheckCircle2, Circle, AlertCircle,
  Gamepad2, Image as ImageIcon, Store, Trophy, Users, Megaphone, BarChart3, Shield,
  Plus, Trash2, Eye, EyeOff, RefreshCw, Loader2, Star,
  Video, Camera, Film, Package, Key, Lock, TrendingUp, ChevronDown,
  Calendar, Pencil, Check, X, Link2, Globe, MessageSquare, Zap, Info,
  BookOpen, Clapperboard, Radio, Monitor, Smartphone
} from "lucide-react";
import { FaSteam, FaDiscord, FaTwitter, FaYoutube, FaGlobe } from "react-icons/fa";
import { SiEpicgames, SiItchdotio, SiGogdotcom } from "react-icons/si";

const GREEN = "#B8FF1B";

const RELEASE_STATUS_OPTIONS = [
  { value: "in_development", label: "In Development" },
  { value: "coming_soon", label: "Coming Soon" },
  { value: "demo_available", label: "Demo Available" },
  { value: "early_access", label: "Early Access" },
  { value: "released", label: "Released" },
  { value: "on_hold", label: "On Hold" },
];

const PLATFORM_OPTIONS = [
  { value: "windows", label: "Windows" },
  { value: "mac", label: "macOS" },
  { value: "linux", label: "Linux" },
  { value: "ps4", label: "PlayStation 4" },
  { value: "ps5", label: "PlayStation 5" },
  { value: "xbox", label: "Xbox" },
  { value: "switch", label: "Nintendo Switch" },
  { value: "ios", label: "iOS" },
  { value: "android", label: "Android" },
  { value: "web", label: "Web Browser" },
];

const AGE_RATING_OPTIONS = [
  { value: "everyone", label: "Everyone (E)" },
  { value: "everyone10", label: "Everyone 10+ (E10+)" },
  { value: "teen", label: "Teen (T)" },
  { value: "mature", label: "Mature 17+ (M)" },
  { value: "adults_only", label: "Adults Only 18+ (AO)" },
  { value: "pegi3", label: "PEGI 3" },
  { value: "pegi7", label: "PEGI 7" },
  { value: "pegi12", label: "PEGI 12" },
  { value: "pegi16", label: "PEGI 16" },
  { value: "pegi18", label: "PEGI 18" },
];

const UPDATE_TYPES = [
  "Announcement", "Patch Notes", "Development Update", "Roadmap",
  "Event", "Release Announcement", "DLC or Expansion", "Community Update"
];

type IndieProfile = {
  id?: number;
  userId?: number;
  gameName?: string;
  releaseStatus?: string;
  releaseDate?: string;
  price?: string;
  isFree?: boolean;
  studioName?: string;
  studioFoundedYear?: string;
  studioTeamSize?: string;
  studioWebsite?: string;
  studioCountry?: string;
  shortDescription?: string;
  fullDescription?: string;
  keyFeatures?: string[];
  genres?: string[];
  tags?: string[];
  headerImageUrl?: string;
  capsuleImageUrl?: string;
  trailerUrl?: string;
  screenshotUrls?: string[];
  platforms?: string[];
  steamUrl?: string;
  steamAppId?: string;
  epicUrl?: string;
  epicSlug?: string;
  itchUrl?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  discordUrl?: string;
  ageRating?: string;
  supportedLanguages?: string[];
  contentDescriptors?: string[];
  [key: string]: any;
};

function FieldSourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const labels: Record<string, string> = {
    steam: "Steam",
    epic: "Epic",
    itch: "itch.io",
    manual: "Manual",
  };
  const colors: Record<string, string> = {
    steam: "#1b9aed",
    epic: "#2d2d2d",
    itch: "#fa5c5c",
    manual: GREEN,
  };
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium ml-2"
      style={{ background: colors[source] || "#333", color: source === "manual" ? "#000" : "#fff" }}>
      {labels[source] || source}
    </span>
  );
}

function TagInput({
  value = [],
  onChange,
  placeholder = "Add tag...",
}: {
  value?: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const t = input.trim();
    if (t && !value.includes(t)) {
      onChange([...value, t]);
      setInput("");
    }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag) => (
          <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
            style={{ background: "#1a1a1a", border: "1px solid #333", color: "#ccc" }}>
            {tag}
            <button onClick={() => onChange(value.filter((t) => t !== tag))} className="hover:text-red-400 transition-colors">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-gray-600 h-8 text-sm" />
        <Button type="button" onClick={add} size="sm" variant="outline"
          className="border-[#333] text-gray-400 hover:text-white h-8">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function computeCompleteness(profile: IndieProfile, userAvatarUrl?: string, userBannerUrl?: string): {
  score: number;
  missing: string[];
  essentialsMet: boolean;
  bountyEssentialsMet: boolean;
} {
  const items: { label: string; met: boolean; weight: number }[] = [
    { label: "Game title", met: !!profile.gameName, weight: 15 },
    { label: "Short description", met: !!profile.shortDescription, weight: 10 },
    { label: "Game icon (profile image)", met: !!userAvatarUrl, weight: 8 },
    { label: "Hero banner artwork", met: !!(profile.headerImageUrl || userBannerUrl), weight: 8 },
    { label: "At least one store or website link", met: !!(profile.steamUrl || profile.epicUrl || profile.itchUrl || profile.websiteUrl), weight: 10 },
    { label: "Genres or tags", met: !!(profile.genres?.length || profile.tags?.length), weight: 5 },
    { label: "Supported platforms", met: !!(profile.platforms?.length), weight: 5 },
    { label: "Official trailer", met: !!profile.trailerUrl, weight: 12 },
    { label: "Three or more screenshots", met: (profile.screenshotUrls?.length ?? 0) >= 3, weight: 10 },
    { label: "Release status", met: !!profile.releaseStatus, weight: 5 },
    { label: "Studio or developer name", met: !!(profile.studioName), weight: 7 },
    { label: "Discord or website link", met: !!(profile.discordUrl || profile.websiteUrl), weight: 5 },
  ];

  const score = items.filter((i) => i.met).reduce((acc, i) => acc + i.weight, 0);
  const missing = items.filter((i) => !i.met).map((i) => i.label);

  const essentialsMet = !!profile.gameName && !!profile.shortDescription &&
    !!(profile.steamUrl || profile.epicUrl || profile.itchUrl || profile.websiteUrl);

  const bountyEssentialsMet = essentialsMet &&
    !!(profile.platforms?.length) &&
    (profile.screenshotUrls?.length ?? 0) >= 1;

  return { score, missing, essentialsMet, bountyEssentialsMet };
}

function ProfileCompleteness({ profile, user }: { profile: IndieProfile; user: any }) {
  const { score, missing } = computeCompleteness(profile, user?.avatarUrl, user?.bannerUrl);
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="mb-6 border-[#222] rounded-xl overflow-hidden" style={{ background: "#0d0d0d" }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">Game Profile Completeness</span>
              <span className="font-black text-lg" style={{ color: score >= 80 ? GREEN : score >= 50 ? "#facc15" : "#f87171" }}>
                {score}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${score}%`, background: score >= 80 ? GREEN : score >= 50 ? "#facc15" : "#f87171" }} />
            </div>
          </div>
          {missing.length > 0 && (
            <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">
              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
        {expanded && missing.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
            <p className="text-xs text-gray-500 mb-2">Missing items:</p>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((m) => (
                <span key={m} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#1a1a1a", color: "#888", border: "1px solid #333" }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SaveButton({ onClick, isPending }: { onClick: () => void; isPending: boolean }) {
  return (
    <Button onClick={onClick} disabled={isPending}
      className="font-bold transition-all"
      style={{ background: GREEN, color: "#000", boxShadow: `0 4px 20px -4px ${GREEN}66` }}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
      Save Changes
    </Button>
  );
}

function SectionCard({ title, description, children, icon: Icon }: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <Card className="border-[#1a1a1a] rounded-xl" style={{ background: "#0d0d0d" }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" style={{ color: GREEN }} />}
          {title}
        </CardTitle>
        {description && <CardDescription className="text-xs text-gray-500">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function FormField({ label, source, children }: { label: string; source?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-400 flex items-center">
        {label}
        {source && <FieldSourceBadge source={source} />}
      </Label>
      {children}
    </div>
  );
}

const inputCls = "bg-[#111] border-[#2a2a2a] text-white placeholder:text-gray-600 focus:border-[#B8FF1B] focus:ring-0";
const textareaCls = "bg-[#111] border-[#2a2a2a] text-white placeholder:text-gray-600 focus:border-[#B8FF1B] focus:ring-0 resize-none";

export default function ManageGameSettings() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("game-profile");

  const { data: indieData, isLoading } = useQuery<{ profile: IndieProfile; fieldMeta: any }>({
    queryKey: ["/api/indie/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const profile = indieData?.profile ?? {};
  const fieldMeta = indieData?.fieldMeta ?? {};

  const saveProfileMut = useMutation({
    mutationFn: (patch: Partial<IndieProfile>) => apiRequest("PUT", "/api/indie/profile", patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/indie/profile"] });
      toast({ title: "Saved", description: "Game profile updated successfully." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: GREEN }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-4xl mx-auto px-3 md:px-6 py-6 pb-24">
        <div className="mb-6">
          <Button variant="ghost" size="sm"
            onClick={() => setLocation(`/studio/${user?.username}`)}
            className="flex items-center gap-2 mb-3 text-gray-400 hover:text-white px-0">
            <ArrowLeft className="h-4 w-4" />
            Back to Game Profile
          </Button>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Manage Game</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your public game profile, media, store information and Bounty Programme.</p>
        </div>

        <ProfileCompleteness profile={profile} user={user} />

        <div className="overflow-x-auto mb-4 -mx-3 px-3">
          <div className="flex gap-1 min-w-max">
            {[
              { id: "game-profile", label: "Game Profile", icon: Gamepad2 },
              { id: "media", label: "Media & Artwork", icon: ImageIcon },
              { id: "store", label: "Store & Platforms", icon: Store },
              { id: "bounty", label: "Bounty Programme", icon: Trophy },
              { id: "content", label: "Creator Content", icon: Users },
              { id: "updates", label: "Updates", icon: Megaphone },
              { id: "analytics", label: "Analytics", icon: BarChart3 },
              { id: "verification", label: "Verification", icon: Shield },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0"
                style={activeTab === id
                  ? { background: GREEN, color: "#000" }
                  : { background: "#111", color: "#888", border: "1px solid #222" }}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {activeTab === "game-profile" && <GameProfileTab profile={profile} fieldMeta={fieldMeta} saveMut={saveProfileMut} />}
          {activeTab === "media" && <MediaTab profile={profile} saveMut={saveProfileMut} />}
          {activeTab === "store" && <StoreTab profile={profile} fieldMeta={fieldMeta} saveMut={saveProfileMut} />}
          {activeTab === "bounty" && <BountyTab user={user} />}
          {activeTab === "content" && <CreatorContentTab user={user} />}
          {activeTab === "updates" && <UpdatesTab user={user} />}
          {activeTab === "analytics" && <AnalyticsTab user={user} profile={profile} />}
          {activeTab === "verification" && <VerificationTab user={user} profile={profile} />}
        </div>
      </div>
    </div>
  );
}

function GameProfileTab({ profile, fieldMeta, saveMut }: {
  profile: IndieProfile;
  fieldMeta: any;
  saveMut: any;
}) {
  const [form, setForm] = useState<IndieProfile>({});
  useEffect(() => { setForm(profile); }, [profile.gameName]);

  const set = (k: keyof IndieProfile, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const src = (k: string) => fieldMeta[k]?.importSource ?? (fieldMeta[k]?.isManualOverride ? "manual" : undefined);

  const save = () => saveMut.mutate({
    gameName: form.gameName, releaseStatus: form.releaseStatus, releaseDate: form.releaseDate,
    price: form.price, isFree: form.isFree, studioName: form.studioName,
    studioFoundedYear: form.studioFoundedYear, studioTeamSize: form.studioTeamSize,
    studioWebsite: form.studioWebsite, studioCountry: form.studioCountry,
    shortDescription: form.shortDescription, fullDescription: form.fullDescription,
    keyFeatures: form.keyFeatures, genres: form.genres, tags: form.tags,
    ageRating: form.ageRating, supportedLanguages: form.supportedLanguages,
    contentDescriptors: form.contentDescriptors,
  });

  return (
    <div className="space-y-4">
      <SectionCard title="Basic Information" icon={Gamepad2}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Game Title" source={src("gameName")}>
            <Input value={form.gameName ?? ""} onChange={(e) => set("gameName", e.target.value)}
              placeholder="Enter your game title" className={inputCls} />
          </FormField>
          <FormField label="Release Status" source={src("releaseStatus")}>
            <Select value={form.releaseStatus ?? ""} onValueChange={(v) => set("releaseStatus", v)}>
              <SelectTrigger className={inputCls}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-[#2a2a2a]">
                {RELEASE_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-white hover:bg-[#1a1a1a]">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Release Date" source={src("releaseDate")}>
            <Input type="text" value={form.releaseDate ?? ""} onChange={(e) => set("releaseDate", e.target.value)}
              placeholder="e.g. Q4 2025 or 15 Nov 2025" className={inputCls} />
          </FormField>
          <FormField label="Price">
            <div className="flex gap-2 items-center">
              <Input value={form.price ?? ""} onChange={(e) => set("price", e.target.value)}
                placeholder="e.g. $9.99" disabled={form.isFree} className={inputCls} />
              <label className="flex items-center gap-1.5 text-xs text-gray-400 whitespace-nowrap cursor-pointer">
                <Switch checked={!!form.isFree} onCheckedChange={(v) => set("isFree", v)} />
                Free
              </label>
            </div>
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Studio / Developer" icon={Users}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Developer / Studio Name" source={src("studioName")}>
            <Input value={form.studioName ?? ""} onChange={(e) => set("studioName", e.target.value)}
              placeholder="Your studio name" className={inputCls} />
          </FormField>
          <FormField label="Publisher Name (optional)">
            <Input value={form.studioCountry ?? ""} onChange={(e) => set("studioCountry", e.target.value)}
              placeholder="Publisher name or country" className={inputCls} />
          </FormField>
          <FormField label="Team Size">
            <Select value={form.studioTeamSize ?? ""} onValueChange={(v) => set("studioTeamSize", v)}>
              <SelectTrigger className={inputCls}>
                <SelectValue placeholder="Select team size" />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-[#2a2a2a]">
                {["Solo dev", "2–5", "6–15", "16–50", "51+"].map((s) => (
                  <SelectItem key={s} value={s} className="text-white hover:bg-[#1a1a1a]">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Founded Year">
            <Input value={form.studioFoundedYear ?? ""} onChange={(e) => set("studioFoundedYear", e.target.value)}
              placeholder="e.g. 2021" className={inputCls} />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Description" icon={BookOpen}>
        <FormField label="Short Tagline / Description" source={src("shortDescription")}>
          <Input value={form.shortDescription ?? ""} onChange={(e) => set("shortDescription", e.target.value)}
            placeholder="One sentence that captures your game" className={inputCls} />
          <p className="text-[11px] text-gray-600 mt-1">{(form.shortDescription ?? "").length}/200 chars</p>
        </FormField>
        <FormField label="Full Game Description" source={src("fullDescription")}>
          <Textarea value={form.fullDescription ?? ""} onChange={(e) => set("fullDescription", e.target.value)}
            placeholder="Tell players everything about your game — story, mechanics, what makes it unique..." rows={6} className={textareaCls} />
        </FormField>
      </SectionCard>

      <SectionCard title="Genres & Tags" icon={Star}>
        <FormField label="Genres" source={src("genres")}>
          <TagInput value={form.genres ?? []} onChange={(v) => set("genres", v)} placeholder="Add genre (e.g. RPG, Shooter)..." />
        </FormField>
        <FormField label="Game Tags" source={src("tags")}>
          <TagInput value={form.tags ?? []} onChange={(v) => set("tags", v)} placeholder="Add tag (e.g. Multiplayer, Open World)..." />
        </FormField>
        <FormField label="Key Features">
          <TagInput value={form.keyFeatures ?? []} onChange={(v) => set("keyFeatures", v)} placeholder="Add feature..." />
        </FormField>
      </SectionCard>

      <SectionCard title="Game Modes & Ratings">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Age Rating">
            <Select value={form.ageRating ?? ""} onValueChange={(v) => set("ageRating", v)}>
              <SelectTrigger className={inputCls}>
                <SelectValue placeholder="Select age rating" />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-[#2a2a2a]">
                {AGE_RATING_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-white hover:bg-[#1a1a1a]">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Content Descriptors">
            <TagInput value={form.contentDescriptors ?? []} onChange={(v) => set("contentDescriptors", v)} placeholder="e.g. Violence, Language..." />
          </FormField>
        </div>
        <FormField label="Supported Languages">
          <TagInput value={form.supportedLanguages ?? []} onChange={(v) => set("supportedLanguages", v)} placeholder="Add language..." />
        </FormField>
      </SectionCard>

      <div className="flex justify-end pt-2">
        <SaveButton onClick={save} isPending={saveMut.isPending} />
      </div>
    </div>
  );
}

function MediaTab({ profile, saveMut }: { profile: IndieProfile; saveMut: any }) {
  const [form, setForm] = useState<IndieProfile>({});
  const [newScreenshot, setNewScreenshot] = useState("");
  useEffect(() => { setForm(profile); }, [profile.gameName]);

  const set = (k: keyof IndieProfile, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const addScreenshot = () => {
    const url = newScreenshot.trim();
    if (url) {
      set("screenshotUrls", [...(form.screenshotUrls ?? []), url]);
      setNewScreenshot("");
    }
  };

  const removeScreenshot = (idx: number) => {
    set("screenshotUrls", (form.screenshotUrls ?? []).filter((_, i) => i !== idx));
  };

  const save = () => saveMut.mutate({
    headerImageUrl: form.headerImageUrl,
    capsuleImageUrl: form.capsuleImageUrl,
    trailerUrl: form.trailerUrl,
    screenshotUrls: form.screenshotUrls,
  });

  return (
    <div className="space-y-4">
      <SectionCard title="Hero Banner & Game Icon" icon={ImageIcon}
        description="These are used as your profile banner and game icon.">
        <FormField label="Hero Banner Artwork URL">
          <Input value={form.headerImageUrl ?? ""} onChange={(e) => set("headerImageUrl", e.target.value)}
            placeholder="https://..." className={inputCls} />
          {form.headerImageUrl && (
            <div className="mt-2 rounded-lg overflow-hidden border border-[#2a2a2a]" style={{ maxHeight: 160 }}>
              <img src={form.headerImageUrl} alt="Banner preview" className="w-full object-cover" style={{ maxHeight: 160 }} onError={(e) => { (e.target as any).style.display = "none"; }} />
            </div>
          )}
        </FormField>
        <FormField label="Capsule / Cover Image URL">
          <Input value={form.capsuleImageUrl ?? ""} onChange={(e) => set("capsuleImageUrl", e.target.value)}
            placeholder="https://..." className={inputCls} />
          {form.capsuleImageUrl && (
            <div className="mt-2 w-32 rounded-lg overflow-hidden border border-[#2a2a2a]">
              <img src={form.capsuleImageUrl} alt="Capsule preview" className="w-full object-cover" onError={(e) => { (e.target as any).style.display = "none"; }} />
            </div>
          )}
        </FormField>
      </SectionCard>

      <SectionCard title="Official Trailer" icon={Film}
        description="Your primary trailer is featured prominently on your game profile.">
        <FormField label="Trailer URL (YouTube, Vimeo, or direct video)">
          <Input value={form.trailerUrl ?? ""} onChange={(e) => set("trailerUrl", e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..." className={inputCls} />
        </FormField>
        {form.trailerUrl && (
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "#111", border: "1px solid #222" }}>
            <Video className="h-4 w-4" style={{ color: GREEN }} />
            <a href={form.trailerUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline truncate flex-1">{form.trailerUrl}</a>
            <ExternalLink className="h-3 w-3 text-gray-500" />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Screenshot Gallery" icon={Camera}
        description="Add up to 16 screenshots. The first screenshot is shown as featured.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {(form.screenshotUrls ?? []).map((url, idx) => (
            <div key={idx} className="relative group rounded-lg overflow-hidden border border-[#2a2a2a]" style={{ aspectRatio: "16/9", background: "#111" }}>
              <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as any).style.opacity = "0.3"; }} />
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {idx === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold absolute top-1.5 left-1.5" style={{ background: GREEN, color: "#000" }}>Featured</span>}
                <button onClick={() => removeScreenshot(idx)} className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 transition-colors">
                  <Trash2 className="h-3 w-3 text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
        {(form.screenshotUrls ?? []).length < 16 && (
          <div className="flex gap-2">
            <Input value={newScreenshot} onChange={(e) => setNewScreenshot(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addScreenshot())}
              placeholder="Paste screenshot URL..." className={inputCls} />
            <Button type="button" onClick={addScreenshot} size="sm" variant="outline"
              className="border-[#333] text-gray-400 hover:text-white">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <p className="text-[11px] text-gray-600">{form.screenshotUrls?.length ?? 0}/16 screenshots</p>
      </SectionCard>

      <div className="flex justify-end pt-2">
        <SaveButton onClick={save} isPending={saveMut.isPending} />
      </div>
    </div>
  );
}

function StoreTab({ profile, fieldMeta, saveMut }: {
  profile: IndieProfile;
  fieldMeta: any;
  saveMut: any;
}) {
  const [form, setForm] = useState<IndieProfile>({});
  useEffect(() => { setForm(profile); }, [profile.gameName]);

  const set = (k: keyof IndieProfile, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const togglePlatform = (p: string) => {
    const cur = form.platforms ?? [];
    set("platforms", cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]);
  };

  const save = () => saveMut.mutate({
    steamUrl: form.steamUrl, steamAppId: form.steamAppId,
    epicUrl: form.epicUrl, epicSlug: form.epicSlug,
    itchUrl: form.itchUrl,
    websiteUrl: form.websiteUrl, twitterUrl: form.twitterUrl,
    discordUrl: form.discordUrl, platforms: form.platforms,
  });

  const stores = [
    { key: "steam", icon: FaSteam, label: "Steam", urlKey: "steamUrl", idKey: "steamAppId", idLabel: "App ID", color: "#1b9aed" },
    { key: "epic", icon: SiEpicgames, label: "Epic Games Store", urlKey: "epicUrl", idKey: "epicSlug", idLabel: "Slug", color: "#fff" },
    { key: "itch", icon: SiItchdotio, label: "itch.io", urlKey: "itchUrl", idKey: null, idLabel: "", color: "#fa5c5c" },
  ] as const;

  const socialLinks = [
    { key: "websiteUrl", icon: FaGlobe, label: "Official Website" },
    { key: "twitterUrl", icon: FaTwitter, label: "Twitter / X" },
    { key: "discordUrl", icon: FaDiscord, label: "Discord" },
  ] as const;

  return (
    <div className="space-y-4">
      <SectionCard title="Connected Stores" icon={Store}
        description="Store links appear as buttons on your public game profile.">
        {stores.map(({ key, icon: Icon, label, urlKey, idKey, idLabel, color }) => (
          <div key={key} className="p-3 rounded-lg border" style={{ background: "#111", borderColor: "#222" }}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-4 w-4" style={{ color }} />
              <span className="text-sm font-semibold text-white">{label}</span>
              {(form as any)[urlKey] && <CheckCircle2 className="h-3.5 w-3.5 ml-auto" style={{ color: GREEN }} />}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-gray-500 mb-1 block">Store URL</Label>
                <Input value={(form as any)[urlKey] ?? ""} onChange={(e) => set(urlKey as any, e.target.value)}
                  placeholder={`https://store.example.com/...`} className={`${inputCls} text-sm`} />
              </div>
              {idKey && (
                <div>
                  <Label className="text-[11px] text-gray-500 mb-1 block">{idLabel}</Label>
                  <Input value={(form as any)[idKey] ?? ""} onChange={(e) => set(idKey as any, e.target.value)}
                    placeholder={idLabel} className={`${inputCls} text-sm`} />
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="p-3 rounded-lg border" style={{ background: "#0d0d0d", borderColor: "#1a1a1a", borderStyle: "dashed" }}>
          <p className="text-xs text-gray-600 text-center">Additional stores (GOG, PlayStation, Xbox, Nintendo) — coming soon</p>
        </div>
      </SectionCard>

      <SectionCard title="Social & Official Links" icon={Globe}>
        {socialLinks.map(({ key, icon: Icon, label }) => (
          <FormField key={key} label={label}>
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <Input value={(form as any)[key] ?? ""} onChange={(e) => set(key as any, e.target.value)}
                placeholder="https://..." className={inputCls} />
            </div>
          </FormField>
        ))}
      </SectionCard>

      <SectionCard title="Platform Support" icon={Monitor}
        description="Select all platforms your game runs on.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PLATFORM_OPTIONS.map(({ value, label }) => {
            const active = (form.platforms ?? []).includes(value);
            return (
              <button key={value} type="button" onClick={() => togglePlatform(value)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={active
                  ? { background: `${GREEN}22`, border: `1px solid ${GREEN}88`, color: GREEN }
                  : { background: "#111", border: "1px solid #222", color: "#666" }}>
                {active ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <Circle className="h-3.5 w-3.5 flex-shrink-0" />}
                {label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <div className="flex justify-end pt-2">
        <SaveButton onClick={save} isPending={saveMut.isPending} />
      </div>
    </div>
  );
}

function BountyTab({ user }: { user: any }) {
  const { data: campaignsData } = useQuery<any>({
    queryKey: ["/api/campaigns"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: bountyData } = useQuery<any>({
    queryKey: ["/api/indie/bounty-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const statusInfo = {
    not_enrolled: { label: "Not Enrolled", color: "#555", bg: "#1a1a1a" },
    draft: { label: "Enrolment Draft", color: "#facc15", bg: "#1f1a00" },
    pending: { label: "Awaiting Review", color: "#60a5fa", bg: "#00101f" },
    approved: { label: "Approved", color: GREEN, bg: "#0d1f00" },
    live: { label: "Live", color: GREEN, bg: "#0d1f00" },
    paused: { label: "Paused", color: "#f87171", bg: "#1f0d00" },
  };

  const currentStatus = bountyData?.status ?? "not_enrolled";
  const info = statusInfo[currentStatus as keyof typeof statusInfo] ?? statusInfo.not_enrolled;

  return (
    <div className="space-y-4">
      <SectionCard title="Programme Status" icon={Trophy}>
        <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: info.bg, border: `1px solid ${info.color}44` }}>
          <div>
            <p className="text-xs text-gray-500 mb-1">Current Status</p>
            <p className="font-bold text-lg" style={{ color: info.color }}>{info.label}</p>
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${info.color}22` }}>
            <Trophy className="h-6 w-6" style={{ color: info.color }} />
          </div>
        </div>
        {currentStatus === "not_enrolled" && (
          <div className="p-4 rounded-xl" style={{ background: "#111", border: "1px solid #222" }}>
            <h4 className="font-bold text-white mb-1 text-sm">About the Bounty Programme</h4>
            <p className="text-xs text-gray-500 mb-3">Run verified campaigns where Gamefolio creators make content for your game in exchange for demo/full-game keys and XP rewards. Only verified games can run public campaigns.</p>
            <Button size="sm" style={{ background: GREEN, color: "#000" }}>
              <Trophy className="h-3.5 w-3.5 mr-1.5" />
              Enrol in Bounty Programme
            </Button>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Key Management" icon={Key}
        description="Manage your demo and full-game key inventories. Keys are encrypted and never logged.">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Demo Keys", stats: bountyData?.demoKeys ?? { uploaded: 0, valid: 0, available: 0, claimed: 0 } },
            { label: "Full-Game Keys", stats: bountyData?.fullGameKeys ?? { uploaded: 0, valid: 0, available: 0, awarded: 0 } },
          ].map(({ label, stats }) => (
            <div key={label} className="p-3 rounded-xl" style={{ background: "#111", border: "1px solid #222" }}>
              <p className="text-xs font-bold text-white mb-2">{label}</p>
              {Object.entries(stats).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-gray-500 capitalize">{k}</span>
                  <span className="font-semibold text-white">{String(v)}</span>
                </div>
              ))}
              <Button size="sm" variant="outline" className="w-full mt-2 border-[#333] text-gray-400 hover:text-white text-xs h-7">
                <Upload className="h-3 w-3 mr-1" /> Upload Keys
              </Button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Active Campaigns" icon={Zap}>
        {campaignsData?.campaigns?.length > 0 ? (
          <div className="space-y-2">
            {campaignsData.campaigns.slice(0, 5).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#111", border: "1px solid #222" }}>
                <div>
                  <p className="text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-[11px] text-gray-500">{c.participantCount ?? 0} creators</p>
                </div>
                <Badge className="text-xs" style={{ background: `${GREEN}22`, color: GREEN, border: `1px solid ${GREEN}44` }}>
                  {c.status ?? "active"}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Zap className="h-8 w-8 mx-auto mb-2 text-gray-600" />
            <p className="text-sm text-gray-500">No active campaigns</p>
            <p className="text-xs text-gray-600 mt-1">Enrol in the Bounty Programme to start running campaigns</p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function CreatorContentTab({ user }: { user: any }) {
  const [contentType, setContentType] = useState<"all" | "clips" | "reels" | "screenshots">("all");
  const [sort, setSort] = useState("newest");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/indie/creator-content", contentType, sort],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {(["all", "clips", "reels", "screenshots"] as const).map((t) => (
            <button key={t} onClick={() => setContentType(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
              style={contentType === t
                ? { background: GREEN, color: "#000" }
                : { background: "#111", color: "#666", border: "1px solid #222" }}>
              {t}
            </button>
          ))}
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-36 h-8 text-xs bg-[#111] border-[#222] text-gray-400">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#111] border-[#2a2a2a]">
            <SelectItem value="newest" className="text-white text-xs">Newest</SelectItem>
            <SelectItem value="most_viewed" className="text-white text-xs">Most Viewed</SelectItem>
            <SelectItem value="most_liked" className="text-white text-xs">Most Liked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12" style={{ background: "#0d0d0d", borderRadius: 12, border: "1px solid #1a1a1a" }}>
          <Users className="h-10 w-10 mx-auto mb-3 text-gray-700" />
          <p className="text-sm font-semibold text-gray-400">No creator content yet</p>
          <p className="text-xs text-gray-600 mt-1">Content from Gamefolio creators tagged with your game will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item: any) => (
            <div key={item.id} className="rounded-xl overflow-hidden border border-[#222]" style={{ background: "#111" }}>
              <div className="aspect-video bg-[#0d0d0d] relative">
                {item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                <div className="absolute bottom-1.5 left-1.5">
                  <Badge className="text-[10px]" style={{ background: "#000a", color: "#ccc" }}>{item.type}</Badge>
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                <p className="text-[11px] text-gray-500">@{item.username}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UpdatesTab({ user }: { user: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", type: "Announcement", summary: "", content: "", publishDate: "", status: "draft" as "draft" | "published" });

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/indie/updates"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const createMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/indie/updates", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/indie/updates"] });
      setShowForm(false);
      resetForm();
      toast({ title: "Update published" });
    },
    onError: () => toast({ title: "Error", description: "Failed to save update.", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/indie/updates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/indie/updates"] });
      toast({ title: "Update deleted" });
    },
  });

  const resetForm = () => setForm({ title: "", type: "Announcement", summary: "", content: "", publishDate: "", status: "draft" });
  const updates = data?.updates ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white">Game Updates</h3>
          <p className="text-xs text-gray-500">Publish announcements, patch notes and development updates</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}
          style={{ background: GREEN, color: "#000" }}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New Update
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>
      ) : updates.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
          <Megaphone className="h-10 w-10 mx-auto mb-3 text-gray-700" />
          <p className="text-sm font-semibold text-gray-400">No updates yet</p>
          <p className="text-xs text-gray-600 mt-1">Published updates appear on your public game profile</p>
        </div>
      ) : (
        <div className="space-y-2">
          {updates.map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-white text-sm truncate">{u.title}</p>
                  <Badge className="text-[10px] flex-shrink-0" style={u.status === "published"
                    ? { background: `${GREEN}22`, color: GREEN, border: `1px solid ${GREEN}44` }
                    : { background: "#1a1a1a", color: "#666", border: "1px solid #333" }}>
                    {u.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">{u.type} · {u.publishDate ? new Date(u.publishDate).toLocaleDateString() : "No date"}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => deleteMut.mutate(u.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg" style={{ background: "#0d0d0d", border: "1px solid #222" }}>
          <DialogHeader>
            <DialogTitle className="text-white">New Update</DialogTitle>
            <DialogDescription className="text-gray-500 text-xs">Create a new update for your game profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <FormField label="Update Type">
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-[#2a2a2a]">
                  {UPDATE_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Title">
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Update title" className={inputCls} />
            </FormField>
            <FormField label="Summary">
              <Textarea value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="Brief description of this update" rows={2} className={textareaCls} />
            </FormField>
            <FormField label="Full Content">
              <Textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Full update details, patch notes, changelog..." rows={4} className={textareaCls} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Publish Date">
                <Input type="date" value={form.publishDate} onChange={(e) => setForm((f) => ({ ...f, publishDate: e.target.value }))}
                  className={inputCls} />
              </FormField>
              <FormField label="Status">
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
                  <SelectTrigger className={inputCls}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-[#2a2a2a]">
                    <SelectItem value="draft" className="text-white">Draft</SelectItem>
                    <SelectItem value="published" className="text-white">Published</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowForm(false)} className="text-gray-400">Cancel</Button>
            <Button disabled={!form.title || createMut.isPending} onClick={() => createMut.mutate(form)}
              style={{ background: GREEN, color: "#000" }}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {form.status === "published" ? "Publish" : "Save Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnalyticsTab({ user, profile }: { user: any; profile: IndieProfile }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/indie/analytics"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const stats = data ?? {};

  const profileMetrics = [
    { label: "Profile Views", value: stats.profileViews ?? "—", icon: Eye },
    { label: "Unique Visitors", value: stats.uniqueVisitors ?? "—", icon: Users },
    { label: "Trailer Plays", value: stats.trailerPlays ?? "—", icon: Film },
    { label: "Store Page Clicks", value: stats.storeClicks ?? "—", icon: Store },
    { label: "Screenshot Views", value: stats.screenshotViews ?? "—", icon: Camera },
    { label: "Website Clicks", value: stats.websiteClicks ?? "—", icon: Globe },
  ];

  const creatorMetrics = [
    { label: "Creators Joined", value: stats.creatorsJoined ?? "—", icon: Users },
    { label: "Clips Generated", value: stats.clipsGenerated ?? "—", icon: Clapperboard },
    { label: "Reels Generated", value: stats.reelsGenerated ?? "—", icon: Film },
    { label: "Screenshots", value: stats.screenshotsGenerated ?? "—", icon: Camera },
    { label: "Livestream Hours", value: stats.livestreamHours ?? "—", icon: Radio },
    { label: "Total Content Views", value: stats.totalContentViews ?? "—", icon: TrendingUp },
  ];

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>;

  return (
    <div className="space-y-4">
      <SectionCard title="Profile Performance" icon={TrendingUp}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {profileMetrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="p-3 rounded-xl text-center" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
              <Icon className="h-4 w-4 mx-auto mb-1.5 text-gray-500" />
              <p className="text-lg font-black text-white">{value}</p>
              <p className="text-[11px] text-gray-600">{label}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Creator Activity" icon={Users}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {creatorMetrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="p-3 rounded-xl text-center" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
              <Icon className="h-4 w-4 mx-auto mb-1.5 text-gray-500" />
              <p className="text-lg font-black text-white">{value}</p>
              <p className="text-[11px] text-gray-600">{label}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Key Performance" icon={Key}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Demo Keys Uploaded", value: stats.demoKeysUploaded ?? "—" },
            { label: "Demo Keys Claimed", value: stats.demoKeysClaimed ?? "—" },
            { label: "Full-Game Keys Awarded", value: stats.fullGameKeysAwarded ?? "—" },
            { label: "Campaign Completions", value: stats.campaignCompletions ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-xl text-center" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
              <p className="text-lg font-black text-white">{value}</p>
              <p className="text-[11px] text-gray-600">{label}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {!stats.profileViews && (
        <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: "#0d1f00", border: `1px solid ${GREEN}33` }}>
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
          <p className="text-xs text-gray-400">Analytics data will populate as creators discover and engage with your game profile. Only real Gamefolio activity is tracked — no estimates.</p>
        </div>
      )}
    </div>
  );
}

function VerificationTab({ user, profile }: { user: any; profile: IndieProfile }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/indie/verification"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const verifications = [
    { key: "developer_identity", label: "Developer Identity", desc: "Verify you are a real developer or studio", status: data?.developerIdentity ?? "not_started" },
    { key: "game_ownership", label: "Game Ownership", desc: "Confirm you own the rights to this game", status: data?.gameOwnership ?? "not_started" },
    { key: "steam_ownership", label: "Steam Ownership", desc: "Link and verify your Steam developer account", status: data?.steamOwnership ?? (profile.steamAppId ? "pending" : "not_started") },
    { key: "epic_ownership", label: "Epic Games Store", desc: "Verify your Epic Games developer listing", status: data?.epicOwnership ?? "not_started" },
    { key: "itch_ownership", label: "itch.io Ownership", desc: "Ownership verified via API key", status: data?.itchOwnership ?? (profile.itchUrl ? "pending" : "not_started") },
    { key: "website_domain", label: "Official Website", desc: "Verify your official domain/website", status: data?.websiteDomain ?? "not_started" },
  ];

  const statusConfig = {
    not_started: { label: "Not Started", color: "#555", icon: Circle },
    pending: { label: "Pending Review", color: "#60a5fa", icon: Clock },
    approved: { label: "Verified", color: GREEN, icon: CheckCircle2 },
    rejected: { label: "Rejected", color: "#f87171", icon: AlertCircle },
    changes_requested: { label: "Changes Requested", color: "#facc15", icon: AlertCircle },
  };

  const allVerified = verifications.every((v) => v.status === "approved");

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>;

  return (
    <div className="space-y-4">
      {allVerified && (
        <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: "#0d1f00", border: `1px solid ${GREEN}44` }}>
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: GREEN }} />
          <div>
            <p className="font-bold text-sm" style={{ color: GREEN }}>Gamefolio Verified ✓</p>
            <p className="text-xs text-gray-500">Your game is fully verified. You can run public Bounty Programme campaigns.</p>
          </div>
        </div>
      )}

      {!allVerified && (
        <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: "#1f1000", border: "1px solid #facc1533" }}>
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-yellow-500" />
          <p className="text-xs text-gray-400">Verification is required before running public Bounty Programme campaigns. Complete as many verifications as possible to unlock all features.</p>
        </div>
      )}

      <SectionCard title="Verification Status" icon={Shield}>
        <div className="space-y-2">
          {verifications.map(({ key, label, desc, status }) => {
            const cfg = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.not_started;
            const Icon = cfg.icon;
            return (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 flex-shrink-0" style={{ color: cfg.color }} />
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-[11px] text-gray-500">{desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                  {status === "not_started" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs border-[#333] text-gray-400 hover:text-white">
                      Start
                    </Button>
                  )}
                  {status === "changes_requested" && (
                    <Button size="sm" className="h-7 text-xs" style={{ background: GREEN, color: "#000" }}>
                      Resubmit
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
