import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Rocket, Gamepad2, Star, TrendingUp, Users, Film, MessageSquare,
  Zap, Bug, ChevronRight, ChevronLeft, Check, ShieldCheck, Clock,
  KeyRound, Lock, AlertTriangle, Loader2, X, Target, Calendar,
  Radio, BarChart3, Globe, CheckCircle2, Search,
} from "lucide-react";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Goal {
  id: string;
  label: string;
  desc: string;
  icon: any;
  category: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const GOALS: Goal[] = [
  { id: "demo",        label: "Promote a Playable Demo",       desc: "Get creators playing and covering your demo before launch.",              icon: Gamepad2,      category: "demo_promotion" },
  { id: "launch",      label: "Launch a New Game",             desc: "Build momentum for your game's release with a creator campaign.",          icon: Rocket,        category: "game_launch" },
  { id: "early_access",label: "Promote Early Access",          desc: "Recruit creators to cover your early access title.",                       icon: Star,          category: "game_launch" },
  { id: "update",      label: "Promote a Major Update",        desc: "Drive attention to a major new version or seasonal content.",              icon: TrendingUp,    category: "updates_dlc" },
  { id: "dlc",         label: "Promote DLC",                   desc: "Get creators covering your new downloadable content.",                     icon: Zap,           category: "updates_dlc" },
  { id: "content",     label: "Generate Creator Content",      desc: "Build a library of clips, reels and screenshots of your game.",            icon: Film,          category: "content_generation" },
  { id: "community",   label: "Grow Community Awareness",      desc: "Expand your game's community across social platforms.",                    icon: Users,         category: "community_growth" },
  { id: "streaming",   label: "Recruit Streamers",             desc: "Find streamers willing to go live with your game.",                        icon: Radio,         category: "streaming" },
  { id: "reviews",     label: "Collect Reviews and Feedback",  desc: "Get honest written and video reviews from real players.",                  icon: MessageSquare, category: "reviews_feedback" },
  { id: "bugs",        label: "Test Bugs and Gameplay",        desc: "Use creators to stress-test your game and surface issues.",                icon: Bug,           category: "bug_testing" },
];

const STEP_LABELS = ["Choose Goal", "Pick Template", "Customise", "Commit Keys", "Review & Launch"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StepHeader({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-500"
            style={{ background: i < step ? NEON : i === step - 1 ? "rgba(183,255,24,0.4)" : "rgba(255,255,255,0.08)" }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-0.5">
            Step {step} of {total}
          </p>
          <h2 className="text-xl font-black text-white">{label}</h2>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Choose Goal ──────────────────────────────────────────────────────

function StepChooseGoal({ selected, onSelect }: { selected: Goal | null; onSelect: (g: Goal) => void }) {
  return (
    <div>
      <p className="text-sm text-white/45 mb-7 max-w-xl">
        Tell Gamefolio what you want to achieve. We'll automatically create the right creator bounties for your game.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GOALS.map(goal => {
          const active = selected?.id === goal.id;
          return (
            <button key={goal.id} onClick={() => onSelect(goal)}
              className="flex items-start gap-4 p-4 rounded-2xl text-left transition-all group"
              style={{
                background: active ? "rgba(183,255,24,0.07)" : "rgba(255,255,255,0.025)",
                border: `1px solid ${active ? "rgba(183,255,24,0.35)" : "rgba(255,255,255,0.07)"}`,
              }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: active ? "rgba(183,255,24,0.15)" : "rgba(255,255,255,0.06)" }}>
                <goal.icon className="w-4 h-4" style={{ color: active ? NEON : "rgba(255,255,255,0.4)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold mb-0.5" style={{ color: active ? NEON : "rgba(255,255,255,0.85)" }}>
                  {goal.label}
                </div>
                <div className="text-[11px] leading-snug" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {goal.desc}
                </div>
              </div>
              {active && <Check className="w-4 h-4 shrink-0 mt-1" style={{ color: NEON }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Pick Template ────────────────────────────────────────────────────

function StepPickTemplate({
  goal, selected, onSelect,
}: { goal: Goal; selected: any; onSelect: (t: any) => void }) {
  const { data: allTemplates = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/campaigns/templates"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const templates = allTemplates.filter(t =>
    t.category === goal.category || t.status === "available"
  );

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} />
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <goal.icon className="w-4 h-4" style={{ color: NEON }} />
        <p className="text-sm font-bold" style={{ color: NEON }}>{goal.label}</p>
      </div>
      <p className="text-sm text-white/40 mb-7">
        Choose a Gamefolio-verified campaign template. Each template includes pre-built bounties and proven reward structures.
      </p>

      {templates.length === 0 ? (
        <div className="text-center py-16 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)" }}>
          <Target className="w-8 h-8 mx-auto mb-3 text-white/15" />
          <p className="text-sm text-white/35 mb-1">No templates yet for this goal</p>
          <p className="text-xs text-white/20">Check back soon — Gamefolio is building more verified campaign templates.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t: any) => {
            const active = selected?.id === t.id;
            const bounties: any[] = t.bounties ?? [];
            return (
              <button key={t.id} onClick={() => onSelect(t)}
                className="w-full text-left rounded-2xl transition-all"
                style={{
                  background: active ? "rgba(183,255,24,0.055)" : "rgba(255,255,255,0.025)",
                  border: `1px solid ${active ? "rgba(183,255,24,0.3)" : "rgba(255,255,255,0.07)"}`,
                }}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1"
                          style={{ background: "rgba(183,255,24,0.1)", color: NEON }}>
                          <ShieldCheck className="w-2.5 h-2.5" /> GAMEFOLIO VERIFIED
                        </span>
                        {t.difficulty && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>
                            {t.difficulty}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-white leading-tight">{t.name}</h3>
                      <p className="text-[12px] text-white/40 mt-1 line-clamp-2">{t.description}</p>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center mt-1"
                      style={{ borderColor: active ? NEON : "rgba(255,255,255,0.2)", background: active ? NEON : "transparent" }}>
                      {active && <Check className="w-3.5 h-3.5" style={{ color: "#070b10" }} />}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { icon: Clock,    label: "Duration",   value: `${t.duration}d` },
                      { icon: Users,    label: "Creators",   value: t.participant_capacity },
                      { icon: KeyRound, label: "Demo Keys",  value: t.demo_keys_required > 0 ? t.demo_keys_required : "None" },
                      { icon: Star,     label: "Max XP",     value: t.max_xp > 0 ? `${(t.max_xp / 1000).toFixed(0)}k` : "—" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="rounded-xl p-2.5 text-center"
                        style={{ background: "rgba(255,255,255,0.04)" }}>
                        <Icon className="w-3 h-3 mx-auto mb-1 text-white/25" />
                        <div className="text-sm font-black text-white">{value}</div>
                        <div className="text-[9px] text-white/30 uppercase tracking-wide">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {bounties.slice(0, 4).map((b: any, i: number) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded-full text-white/45"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        {b.title}
                      </span>
                    ))}
                    {bounties.length > 4 && (
                      <span className="text-[10px] px-2 py-1 rounded-full text-white/25">
                        +{bounties.length - 4} more bounties
                      </span>
                    )}
                  </div>

                  {(t.estimated_clips > 0 || t.estimated_screenshots > 0) && (
                    <div className="mt-3 text-[10px] text-white/25">
                      Estimated output:{t.estimated_clips > 0 ? ` ${t.estimated_clips} clips` : ""}
                      {t.estimated_screenshots > 0 ? ` · ${t.estimated_screenshots} screenshots` : ""}
                      {t.estimated_feedback > 0 ? ` · ${t.estimated_feedback} reviews` : ""}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Customise ────────────────────────────────────────────────────────

interface CustomSettings {
  campaignName: string;
  description: string;
  startType: "asap" | "scheduled";
  scheduledDate: string;
  keyReleaseMode: "auto" | "approval";
  gameName: string;
  gameId: number | null;
  gameImageUrl: string | null;
  regions: string;
  platforms: string[];
}

const REGION_OPTIONS = [
  { id: "worldwide",        label: "Worldwide" },
  { id: "north_america",    label: "North America" },
  { id: "europe",           label: "Europe" },
  { id: "asia_pacific",     label: "Asia Pacific" },
  { id: "latin_america",    label: "Latin America" },
  { id: "middle_east",      label: "Middle East & Africa" },
];

const PLATFORM_OPTIONS = [
  { id: "pc",      label: "PC (Windows / Mac / Linux)" },
  { id: "ps",      label: "PlayStation" },
  { id: "xbox",    label: "Xbox" },
  { id: "switch",  label: "Nintendo Switch" },
  { id: "mobile",  label: "Mobile (iOS / Android)" },
];

function StepCustomise({ template, settings, onChange }: {
  template: any;
  settings: CustomSettings;
  onChange: (s: Partial<CustomSettings>) => void;
}) {
  const [gameQuery, setGameQuery] = useState("");
  const { data: indieProfile } = useQuery<any>({
    queryKey: ["/api/indie/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: gameResults = [], isFetching } = useQuery<any[]>({
    queryKey: ["/api/games/search", gameQuery],
    queryFn: async () => {
      if (gameQuery.trim().length < 2) return [];
      const res = await fetch(`/api/games/search?q=${encodeURIComponent(gameQuery)}`);
      return res.ok ? res.json() : [];
    },
    enabled: gameQuery.trim().length >= 2,
  });

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const fieldStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff",
    borderRadius: "12px",
    padding: "10px 14px",
    outline: "none",
    width: "100%",
    fontSize: "13px",
  };

  const labelStyle = "text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-1.5";

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/40">
        Personalise your campaign. The bounty requirements, XP rewards and creator protections are managed by Gamefolio and cannot be changed.
      </p>

      {/* Fixed notice */}
      <div className="flex items-start gap-3 rounded-xl p-4"
        style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.15)" }}>
        <Lock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-orange-300 mb-0.5">Gamefolio-managed settings</p>
          <p className="text-[11px] text-orange-300/60">
            Duration ({template.duration} days) · {template.participant_capacity} creator capacity · {template.demo_keys_required} demo keys required · {template.full_keys_required} full game keys required · Bounty requirements · XP values · Moderation rules
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Campaign name */}
        <div className="sm:col-span-2">
          <label className={labelStyle}>Campaign Name</label>
          <input style={fieldStyle} value={settings.campaignName}
            onChange={e => onChange({ campaignName: e.target.value })}
            placeholder={`${template.name} — My Game`} />
        </div>

        {/* Game */}
        <div className="sm:col-span-2">
          <label className={labelStyle}>Your Game</label>
          {indieProfile?.profile?.gameName && (
            <button onClick={() => onChange({
              gameName: indieProfile.profile.gameName,
              gameId: null,
              gameImageUrl: indieProfile.profile.headerImageUrl ?? null,
            })}
              className="flex items-center gap-3 w-full p-3 rounded-xl mb-2 text-left transition-all"
              style={{
                background: settings.gameName === indieProfile.profile.gameName ? "rgba(183,255,24,0.07)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${settings.gameName === indieProfile.profile.gameName ? "rgba(183,255,24,0.3)" : "rgba(255,255,255,0.07)"}`,
              }}>
              {indieProfile.profile.headerImageUrl && (
                <img src={indieProfile.profile.headerImageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{indieProfile.profile.gameName}</div>
                <div className="text-[10px] text-white/30">From your Game Profile</div>
              </div>
              {settings.gameName === indieProfile.profile.gameName && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: NEON }} />}
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
            <input style={{ ...fieldStyle, paddingLeft: "36px" }} value={gameQuery}
              onChange={e => setGameQuery(e.target.value)} placeholder="Or search for your game…" />
            {isFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-white/25" />}
          </div>
          {gameResults.length > 0 && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {gameResults.map((g: any) => (
                <button key={g.id}
                  onClick={() => { onChange({ gameName: g.title, gameId: g.id, gameImageUrl: g.imageUrl ?? null }); setGameQuery(""); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-colors text-sm text-white">
                  {g.imageUrl && <img src={g.imageUrl} alt="" className="w-7 h-7 rounded object-cover shrink-0" />}
                  {g.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <label className={labelStyle}>Public Campaign Description <span className="text-white/20 normal-case font-normal">(optional)</span></label>
          <textarea
            style={{ ...fieldStyle, minHeight: "80px", resize: "vertical" } as any}
            value={settings.description}
            onChange={e => onChange({ description: e.target.value })}
            placeholder="Tell creators what makes your game worth covering…"
          />
        </div>

        {/* Start date */}
        <div>
          <label className={labelStyle}>Start Date</label>
          <div className="space-y-2">
            {(["asap", "scheduled"] as const).map(t => (
              <button key={t} onClick={() => onChange({ startType: t })}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{
                  background: settings.startType === t ? "rgba(183,255,24,0.07)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${settings.startType === t ? "rgba(183,255,24,0.25)" : "rgba(255,255,255,0.07)"}`,
                }}>
                <div className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                  style={{ borderColor: settings.startType === t ? NEON : "rgba(255,255,255,0.2)", background: settings.startType === t ? NEON : "transparent" }}>
                  {settings.startType === t && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#070b10" }} />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    {t === "asap" ? "Start after review" : "Schedule a date"}
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5">
                    {t === "asap" ? "Launches as soon as Gamefolio approves" : "Pick a specific launch date"}
                  </div>
                </div>
              </button>
            ))}
            {settings.startType === "scheduled" && (
              <input type="date" style={{ ...fieldStyle, colorScheme: "dark" } as any}
                value={settings.scheduledDate} min={tomorrowStr}
                onChange={e => onChange({ scheduledDate: e.target.value })} />
            )}
          </div>
        </div>

        {/* Key release */}
        <div>
          <label className={labelStyle}>Demo Key Release</label>
          <div className="space-y-2">
            {([
              { id: "auto",     label: "Automatic",        desc: "Released when creator joins" },
              { id: "approval", label: "Approval Required", desc: "You approve each creator first" },
            ] as const).map(({ id, label, desc }) => (
              <button key={id} onClick={() => onChange({ keyReleaseMode: id })}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{
                  background: settings.keyReleaseMode === id ? "rgba(183,255,24,0.07)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${settings.keyReleaseMode === id ? "rgba(183,255,24,0.25)" : "rgba(255,255,255,0.07)"}`,
                }}>
                <div className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                  style={{ borderColor: settings.keyReleaseMode === id ? NEON : "rgba(255,255,255,0.2)", background: settings.keyReleaseMode === id ? NEON : "transparent" }}>
                  {settings.keyReleaseMode === id && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#070b10" }} />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{label}</div>
                  <div className="text-[10px] text-white/30 mt-0.5">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Eligible Regions */}
        <div>
          <label className={labelStyle}>Eligible Regions</label>
          <select
            style={{ ...fieldStyle, paddingRight: "32px" } as any}
            value={settings.regions}
            onChange={e => onChange({ regions: e.target.value })}>
            {REGION_OPTIONS.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Supported Platforms */}
        <div className="sm:col-span-2">
          <label className={labelStyle}>Supported Platforms <span className="text-white/20 normal-case font-normal">(select all that apply)</span></label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PLATFORM_OPTIONS.map(p => {
              const on = settings.platforms.includes(p.id);
              return (
                <button key={p.id}
                  onClick={() => onChange({
                    platforms: on
                      ? settings.platforms.filter(x => x !== p.id)
                      : [...settings.platforms, p.id],
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: on ? "rgba(183,255,24,0.07)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${on ? "rgba(183,255,24,0.25)" : "rgba(255,255,255,0.07)"}`,
                  }}>
                  <div className="w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center"
                    style={{ borderColor: on ? NEON : "rgba(255,255,255,0.2)", background: on ? NEON : "transparent" }}>
                    {on && <Check className="w-2.5 h-2.5" style={{ color: "#070b10" }} />}
                  </div>
                  <span className="text-[11px] font-semibold" style={{ color: on ? NEON : "rgba(255,255,255,0.55)" }}>
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Commit Keys ──────────────────────────────────────────────────────

function StepCommitKeys({ template, onGoToKeys }: { template: any; onGoToKeys: () => void }) {
  const { data: bountyStatus } = useQuery<any>({
    queryKey: ["/api/indie/bounty-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const demoAvail = bountyStatus?.demoKeys?.available ?? 0;
  const fullAvail = bountyStatus?.fullGameKeys?.available ?? 0;
  const demoRequired = template.demo_keys_required ?? 0;
  const fullRequired = template.full_keys_required ?? 0;

  const demoOk = demoRequired === 0 || demoAvail >= demoRequired;
  const fullOk = fullRequired === 0 || fullAvail >= fullRequired;
  const allOk = demoOk && fullOk;

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/40">
        Before launching, the required keys must be secured in the Gamefolio Key Vault. Keys are locked as escrow once the campaign begins.
      </p>

      {/* Key requirements */}
      <div className="space-y-3">
        {demoRequired > 0 && (
          <div className="rounded-2xl p-5"
            style={{
              background: demoOk ? "rgba(183,255,24,0.04)" : "rgba(248,113,113,0.05)",
              border: `1px solid ${demoOk ? "rgba(183,255,24,0.2)" : "rgba(248,113,113,0.25)"}`,
            }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4" style={{ color: demoOk ? NEON : "#f87171" }} />
                <span className="text-sm font-bold text-white">Demo Keys</span>
              </div>
              {demoOk
                ? <span className="text-xs font-bold flex items-center gap-1" style={{ color: NEON }}><CheckCircle2 className="w-3.5 h-3.5" /> Sufficient</span>
                : <span className="text-xs font-bold flex items-center gap-1 text-red-400"><AlertTriangle className="w-3.5 h-3.5" /> Insufficient</span>}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="text-lg font-black" style={{ color: NEON }}>{demoRequired}</div>
                <div className="text-[9px] text-white/30 uppercase tracking-wide mt-0.5">Required</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="text-lg font-black text-white">{demoAvail}</div>
                <div className="text-[9px] text-white/30 uppercase tracking-wide mt-0.5">In Vault</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="text-lg font-black" style={{ color: demoOk ? NEON : "#f87171" }}>{Math.max(0, demoRequired - demoAvail)}</div>
                <div className="text-[9px] text-white/30 uppercase tracking-wide mt-0.5">Still Needed</div>
              </div>
            </div>
          </div>
        )}

        {fullRequired > 0 && (
          <div className="rounded-2xl p-5"
            style={{
              background: fullOk ? "rgba(96,165,250,0.04)" : "rgba(248,113,113,0.05)",
              border: `1px solid ${fullOk ? "rgba(96,165,250,0.2)" : "rgba(248,113,113,0.25)"}`,
            }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4" style={{ color: fullOk ? "#60a5fa" : "#f87171" }} />
                <span className="text-sm font-bold text-white">Full Game Keys</span>
              </div>
              {fullOk
                ? <span className="text-xs font-bold flex items-center gap-1" style={{ color: "#60a5fa" }}><CheckCircle2 className="w-3.5 h-3.5" /> Sufficient</span>
                : <span className="text-xs font-bold flex items-center gap-1 text-red-400"><AlertTriangle className="w-3.5 h-3.5" /> Insufficient</span>}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="text-lg font-black" style={{ color: "#60a5fa" }}>{fullRequired}</div>
                <div className="text-[9px] text-white/30 uppercase tracking-wide mt-0.5">Required</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="text-lg font-black text-white">{fullAvail}</div>
                <div className="text-[9px] text-white/30 uppercase tracking-wide mt-0.5">In Vault</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="text-lg font-black" style={{ color: fullOk ? "#60a5fa" : "#f87171" }}>{Math.max(0, fullRequired - fullAvail)}</div>
                <div className="text-[9px] text-white/30 uppercase tracking-wide mt-0.5">Still Needed</div>
              </div>
            </div>
          </div>
        )}

        {demoRequired === 0 && fullRequired === 0 && (
          <div className="rounded-2xl p-5 text-center"
            style={{ background: "rgba(183,255,24,0.04)", border: "1px solid rgba(183,255,24,0.15)" }}>
            <CheckCircle2 className="w-7 h-7 mx-auto mb-2" style={{ color: NEON }} />
            <p className="text-sm font-bold text-white">No keys required for this campaign</p>
            <p className="text-xs text-white/30 mt-0.5">You can launch without uploading keys.</p>
          </div>
        )}
      </div>

      {!allOk && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl p-4"
            style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.18)" }}>
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-300">More keys needed</p>
              <p className="text-[11px] text-red-300/60 mt-0.5">
                Upload the required keys to your Key Vault before you can launch. This ensures creators are guaranteed their rewards.
              </p>
            </div>
          </div>
          <button onClick={onGoToKeys}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110"
            style={{ background: "rgba(248,113,113,0.12)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.2)" }}>
            Go to Keys &amp; Rewards to Upload Keys
          </button>
        </div>
      )}

      {allOk && (
        <div className="flex items-start gap-3 rounded-xl p-4"
          style={{ background: "rgba(183,255,24,0.05)", border: "1px solid rgba(183,255,24,0.15)" }}>
          <Lock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: NEON }} />
          <p className="text-[11px] leading-relaxed" style={{ color: "rgba(183,255,24,0.7)" }}>
            Once the campaign begins, committed keys will be locked in the Gamefolio Key Vault. They cannot be withdrawn while creators are participating, completing tasks, or awaiting review.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Review & Launch ──────────────────────────────────────────────────

function StepReviewLaunch({
  goal, template, settings, confirmed, onConfirm,
}: {
  goal: Goal;
  template: any;
  settings: CustomSettings;
  confirmed: boolean;
  onConfirm: (v: boolean) => void;
}) {
  const bounties: any[] = template.bounties ?? [];

  const regionLabel = REGION_OPTIONS.find(r => r.id === settings.regions)?.label ?? "Worldwide";
  const platformsLabel = settings.platforms.length === 0
    ? "All platforms"
    : settings.platforms.map(p => PLATFORM_OPTIONS.find(o => o.id === p)?.label ?? p).join(", ");

  const contentParts: string[] = [];
  if (template.estimated_clips > 0) contentParts.push(`${template.estimated_clips} clips`);
  if (template.estimated_screenshots > 0) contentParts.push(`${template.estimated_screenshots} screenshots`);
  if (template.estimated_feedback > 0) contentParts.push(`${template.estimated_feedback} reviews`);

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Campaign Name",          value: settings.campaignName || template.name },
    { label: "Objective",              value: goal.label },
    { label: "Template",               value: <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" style={{ color: NEON }} />{template.name}</span> },
    { label: "Game",                   value: settings.gameName || "—" },
    { label: "Duration",               value: `${template.duration} days` },
    { label: "Creator Capacity",       value: template.participant_capacity },
    { label: "Start",                  value: settings.startType === "asap" ? "After Gamefolio review" : settings.scheduledDate || "—" },
    { label: "Key Release",            value: settings.keyReleaseMode === "auto" ? "Automatic" : "Approval Required" },
    { label: "Demo Keys Required",     value: template.demo_keys_required > 0 ? template.demo_keys_required : "None" },
    { label: "Full Keys Required",     value: template.full_keys_required > 0 ? template.full_keys_required : "None" },
    { label: "Bounties Included",      value: bounties.length },
    { label: "Total XP Available",     value: template.max_xp > 0 ? `${template.max_xp.toLocaleString()} XP` : "—" },
    { label: "Estimated Content",      value: contentParts.length > 0 ? contentParts.join(" · ") : "—" },
    { label: "Creator Eligibility",    value: regionLabel },
    { label: "Supported Platforms",    value: platformsLabel },
    { label: "Review Deadline",        value: `${template.duration} days after launch` },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/40">
        Review everything before launching. Once creators join, reward commitments are locked.
      </p>

      {/* Summary table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
        {rows.map(({ label, value }, i) => (
          <div key={label}
            className="flex items-start gap-4 px-4 py-3"
            style={{
              borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
            }}>
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-wide w-40 shrink-0 pt-0.5">{label}</div>
            <div className="text-sm text-white flex-1">{value}</div>
          </div>
        ))}
      </div>

      {/* Bounty list */}
      <div>
        <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-3">
          Included Bounties (auto-generated, fixed)
        </div>
        <div className="space-y-2">
          {bounties.map((b: any, i: number) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black"
                style={{ background: "rgba(183,255,24,0.12)", color: NEON }}>{i + 1}</div>
              <span className="flex-1 text-sm font-semibold text-white/80">{b.title}</span>
              <span className="text-[11px] font-bold shrink-0" style={{ color: NEON }}>+{(b.xp_reward ?? 0).toLocaleString()} XP</span>
            </div>
          ))}
        </div>
      </div>

      {/* Escrow warning */}
      <div className="rounded-2xl p-5"
        style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.2)" }}>
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-orange-300 mb-2">Campaign Key Vault — Escrow Protection</p>
            <p className="text-xs text-orange-300/70 leading-relaxed">
              Once this campaign begins, committed keys and rewards will be locked in the Gamefolio Key Vault for participating creators. They <strong className="text-orange-300">cannot be withdrawn</strong> after creators begin completing campaign bounties.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation checkbox */}
      <button onClick={() => onConfirm(!confirmed)}
        className="w-full flex items-start gap-3 text-left p-4 rounded-2xl transition-all"
        style={{
          background: confirmed ? "rgba(183,255,24,0.06)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${confirmed ? "rgba(183,255,24,0.3)" : "rgba(255,255,255,0.09)"}`,
        }}>
        <div className="w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center mt-0.5 transition-all"
          style={{ borderColor: confirmed ? NEON : "rgba(255,255,255,0.2)", background: confirmed ? NEON : "transparent" }}>
          {confirmed && <Check className="w-3 h-3" style={{ color: "#070b10" }} />}
        </div>
        <span className="text-sm text-white/70 leading-snug">
          I understand that the campaign rewards will be committed to the Campaign Key Vault and cannot be withdrawn after creators join and complete bounties.
        </span>
      </button>
    </div>
  );
}

// ─── Main Flow ────────────────────────────────────────────────────────────────

export default function CreateCampaignFlow({
  onComplete,
  onGoToKeys,
}: {
  onComplete: () => void;
  onGoToKeys: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<CustomSettings>({
    campaignName: "",
    description: "",
    startType: "asap",
    scheduledDate: "",
    keyReleaseMode: "auto",
    gameName: "",
    gameId: null,
    gameImageUrl: null,
    regions: "worldwide",
    platforms: [],
  });

  const { data: bountyStatus } = useQuery<any>({
    queryKey: ["/api/indie/bounty-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const keysOk = !selectedTemplate || (
    (selectedTemplate.demo_keys_required === 0 || (bountyStatus?.demoKeys?.available ?? 0) >= selectedTemplate.demo_keys_required) &&
    (selectedTemplate.full_keys_required === 0 || (bountyStatus?.fullGameKeys?.available ?? 0) >= selectedTemplate.full_keys_required)
  );

  const canAdvance = (): boolean => {
    if (step === 1) return !!selectedGoal;
    if (step === 2) return !!selectedTemplate;
    if (step === 3) return settings.gameName.trim().length > 0;
    if (step === 4) return keysOk;
    if (step === 5) return confirmed;
    return false;
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;
    setSubmitting(true);
    try {
      const inst = await apiRequest("POST", "/api/campaigns/instances", {
        templateId: selectedTemplate.id,
        gameName: settings.gameName,
        gameId: settings.gameId,
        gameArtworkUrl: settings.gameImageUrl,
        startType: settings.startType,
        scheduledStart: settings.startType === "scheduled" && settings.scheduledDate ? settings.scheduledDate : null,
        artworkUrl: settings.gameImageUrl || null,
        customName: settings.campaignName || undefined,
        description: settings.description || undefined,
        keyReleaseMode: settings.keyReleaseMode,
        regions: settings.regions,
        platforms: settings.platforms.length > 0 ? settings.platforms : undefined,
      });
      const instData = await inst.json();
      if (!inst.ok) throw new Error(instData.message || "Failed to create campaign");

      const submitRes = await apiRequest("POST", `/api/campaigns/instances/${instData.id}/submit`, {});
      if (!submitRes.ok) throw new Error("Failed to submit campaign for review");

      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/overview"] });

      toast({ description: "Campaign submitted for review. You'll hear back within 24 hours." });
      onComplete();
    } catch (err: any) {
      toast({ description: err.message || "Failed to launch campaign", variant: "gamefolioError" as any });
    } finally {
      setSubmitting(false);
    }
  };

  const updateSettings = (partial: Partial<CustomSettings>) => setSettings(s => ({ ...s, ...partial }));

  const stepLabels = STEP_LABELS;
  const totalSteps = stepLabels.length;

  return (
    <div className="max-w-2xl">
      <StepHeader step={step} total={totalSteps} label={stepLabels[step - 1]} />

      <div className="min-h-[400px]">
        {step === 1 && <StepChooseGoal selected={selectedGoal} onSelect={g => { setSelectedGoal(g); setSelectedTemplate(null); }} />}
        {step === 2 && selectedGoal && <StepPickTemplate goal={selectedGoal} selected={selectedTemplate} onSelect={setSelectedTemplate} />}
        {step === 3 && selectedTemplate && <StepCustomise template={selectedTemplate} settings={settings} onChange={updateSettings} />}
        {step === 4 && selectedTemplate && <StepCommitKeys template={selectedTemplate} onGoToKeys={onGoToKeys} />}
        {step === 5 && selectedGoal && selectedTemplate && (
          <StepReviewLaunch goal={selectedGoal} template={selectedTemplate} settings={settings} confirmed={confirmed} onConfirm={setConfirmed} />
        )}
      </div>

      <div className="flex items-center justify-between pt-8 mt-8"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : undefined}
          disabled={step === 1}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-0"
          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)" }}>
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {step < totalSteps ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canAdvance()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 disabled:opacity-40"
            style={{ background: NEON, color: "#070b10" }}>
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canAdvance() || submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 disabled:opacity-40"
            style={{ background: NEON, color: "#070b10" }}>
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Launching…</>
              : <><Lock className="w-4 h-4" /> Commit Keys &amp; Launch Campaign</>}
          </button>
        )}
      </div>
    </div>
  );
}
