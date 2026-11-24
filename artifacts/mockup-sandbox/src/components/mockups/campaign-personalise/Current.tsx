import './_group.css';
import { useState } from 'react';
import { ArrowRight, Check, ChevronDown, Gamepad2, Globe2, KeyRound, Lock, Zap, FileText } from 'lucide-react';

const NEON = '#B9FF1A';
const fieldStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff", borderRadius: "12px", padding: "10px 14px",
  outline: "none", width: "100%", fontSize: "13px",
};
const PLATFORM_OPTIONS = [
  { id: "windows", label: "Windows" }, { id: "mac", label: "Mac" },
  { id: "linux", label: "Linux" }, { id: "ps", label: "PlayStation" },
  { id: "xbox", label: "Xbox" }, { id: "switch", label: "Nintendo Switch" },
  { id: "mobile", label: "Mobile" },
];
const REGION_OPTIONS = [
  { id: "worldwide", label: "Worldwide" }, { id: "north_america", label: "North America" },
  { id: "europe", label: "Europe" }, { id: "asia_pacific", label: "Asia Pacific" },
  { id: "latin_america", label: "Latin America" }, { id: "middle_east", label: "Middle East & Africa" },
];
const ACCESS_METHODS = [
  { id: "demo_to_full", title: "Demo to Full Game", description: "Creators receive demo or playtest access when they join and unlock the full game after completing the campaign.", Icon: KeyRound },
  { id: "full_game_upfront", title: "Full Game Upfront", description: "Creators receive the full game when they join. Bounty XP is their completion reward.", Icon: Gamepad2 },
  { id: "public_demo", title: "Public Demo", description: "Creators use your publicly available demo without an access key.", Icon: Globe2 },
  { id: "free_to_play", title: "Free-to-Play", description: "No game key is required. Creators earn Bounty XP for completing the campaign.", Icon: Zap },
  { id: "private_playtest", title: "Private Playtest", description: "Creators receive a private playtest key or access code.", Icon: Lock },
  { id: "custom_access", title: "Custom Access", description: "Provide creators with your own access instructions.", Icon: FileText },
] as const;

type AccessId = typeof ACCESS_METHODS[number]["id"];
type Settings = {
  campaignTitle: string;
  description: string;
  startType: "asap" | "scheduled";
  scheduledDate: string;
  scheduledTime: string;
  timeZone: string;
  accessMethod: AccessId;
  completionFullGameKey: boolean;
  customAccessInstructions: string;
  customAccessNeedsKey: boolean;
  platforms: string[];
  regions: string;
  applicationPeriod: number;
};

const INITIAL_SETTINGS: Settings = {
  campaignTitle: "Starfall Tactics Content Boost",
  description: "Build a reusable content library for Starfall Tactics. Capture the tactical combat, squad synergies, and the moments where a plan comes together. Share honest first impressions so we can keep improving the game.",
  startType: "asap",
  scheduledDate: "",
  scheduledTime: "",
  timeZone: "UTC",
  accessMethod: "demo_to_full",
  completionFullGameKey: true,
  customAccessInstructions: "",
  customAccessNeedsKey: false,
  platforms: ["windows"],
  regions: "worldwide",
  applicationPeriod: 30,
};

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="gf-fade-up" aria-label="Step 2: Personalise Your Campaign">
      <div className="flex items-center gap-3.5 mb-7">
        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black"
          style={{ background: NEON, color: "#070b10" }}>2</div>
        <h3 className="text-base font-black text-white">Personalise Your Campaign</h3>
      </div>
      <div className="pl-[42px]">{children}</div>
    </section>
  );
}

function AccessMethodSelector({ settings, onChange }: {
  settings: Settings;
  onChange: (changes: Partial<Settings>) => void;
}) {
  const method = ACCESS_METHODS.find(item => item.id === settings.accessMethod) ?? ACCESS_METHODS[0];
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-bold text-white/75 uppercase tracking-[0.08em] block">How will creators play your game?</label>
        <p className="text-[11px] text-white/50 mt-1">Choose how creators receive access when they join.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {ACCESS_METHODS.map(option => {
          const selected = option.id === settings.accessMethod;
          const Icon = option.Icon;
          return (
            <button key={option.id} type="button" aria-pressed={selected} onClick={() => onChange({
              accessMethod: option.id,
              completionFullGameKey: ["demo_to_full", "public_demo", "private_playtest"].includes(option.id),
            })}
              className="text-left rounded-xl p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9FF1A]"
              style={{ background: selected ? "#182817" : "#111923", border: `1.5px solid ${selected ? NEON : "rgba(255,255,255,0.12)"}` }}>
              <div className="flex items-start gap-3">
                <Icon size={17} style={{ color: selected ? NEON : "rgba(255,255,255,0.55)" }} />
                <div className="text-xs font-black text-white">{option.title}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="rounded-xl px-3.5 py-3" style={{ background: "rgba(255,255,255,0.035)" }}>
        <div className="text-[10px] uppercase tracking-wider font-bold text-white/45">Selected</div>
        <div className="text-sm font-black text-white mt-1">{method.title}</div>
        <p className="text-[11px] leading-relaxed text-white/55 mt-1">{method.description}</p>
      </div>
      {["public_demo", "private_playtest"].includes(settings.accessMethod) && (
        <label className="flex items-center gap-2 text-xs text-white/70">
          <input type="checkbox" checked={settings.completionFullGameKey} onChange={e => onChange({ completionFullGameKey: e.target.checked })} />
          Full-game key unlocked after completion
        </label>
      )}
      {settings.accessMethod === "custom_access" && (
        <div className="space-y-2">
          <textarea value={settings.customAccessInstructions} onChange={e => onChange({ customAccessInstructions: e.target.value })}
            placeholder="Describe how creators access your game…" rows={3} style={{ ...fieldStyle, resize: "vertical" } as React.CSSProperties} />
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input type="checkbox" checked={settings.customAccessNeedsKey} onChange={e => onChange({ customAccessNeedsKey: e.target.checked })} />
            A key or access code is required
          </label>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div><div className="text-[10px] uppercase font-bold tracking-wider text-white/45">Join</div><div className="text-xs font-bold text-white mt-1">{method.id === "free_to_play" || method.id === "public_demo" || (method.id === "custom_access" && !settings.customAccessNeedsKey) ? "No key required" : method.id === "demo_to_full" ? "Demo/playtest key" : method.title}</div></div>
        <div><div className="text-[10px] uppercase font-bold tracking-wider text-white/45">Complete</div><div className="text-xs font-bold text-white mt-1">{settings.completionFullGameKey ? "Full-game key" : "Bounty XP"}</div></div>
      </div>
      {settings.completionFullGameKey && <p className="text-[11px] text-white/55">Full-game access is released after the creator's required campaign objectives have been completed and validated.</p>}
    </div>
  );
}

function PresetPersonalise({ settings, onChange }: {
  settings: Settings;
  onChange: (changes: Partial<Settings>) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const profile = {
    gameName: "Starfall Tactics",
    headerImageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=256&q=80",
    studioName: "Northstar Interactive",
    platforms: ["Windows"],
  };
  const inheritedPlatformIds = ["windows"];
  const inheritedLabels = profile.platforms;
  const preset = { estimatedCreatorMin: 5, estimatedCreatorMax: 10, submissionMin: 25, submissionMax: 50 };
  const gameName = profile.gameName;
  const gameImage = profile.headerImageUrl;
  const studioName = profile.studioName;
  const effectivePlatformIds = settings.platforms.length > 0 ? settings.platforms : inheritedPlatformIds;
  const effectivePlatformLabels = effectivePlatformIds.length > 0
    ? PLATFORM_OPTIONS.filter(option => effectivePlatformIds.includes(option.id)).map(option => option.label)
    : (inheritedLabels.length > 0 ? inheritedLabels : ["All platforms"]);
  const configuredDuration = 14;
  const configuredApplicationPeriod = settings.applicationPeriod || 30;
  const regionLabel = REGION_OPTIONS.find(region => region.id === settings.regions)?.label ?? "Worldwide";
  const labelStyle = "text-[11px] font-bold text-white/75 uppercase tracking-[0.08em] block mb-2";
  const helperStyle = "text-[11px] leading-relaxed text-white/55 mt-1.5";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const timeZoneOptions = Array.from(new Set([
    settings.timeZone || "UTC", "UTC", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Tokyo",
  ]));

  return (
    <div className="gf-fade-up -mx-1 rounded-2xl px-1 py-1" style={{ background: "#0F101B" }}>
      <div className="mx-auto max-w-[900px] space-y-8">
        <div>
          <p className="text-sm leading-relaxed text-white/60 max-w-2xl">
            Just add the details creators need. We've configured the rest of the campaign for you.
          </p>
        </div>
        <div className="space-y-5">
          <div>
            <label htmlFor="campaign-title" className={labelStyle}>Campaign Title <span style={{ color: NEON }}>*</span></label>
            <input id="campaign-title" required maxLength={120} style={fieldStyle} value={settings.campaignTitle}
              onChange={e => onChange({ campaignTitle: e.target.value })}
              placeholder={`${gameName} Content Boost`} />
            <p className={helperStyle}>This is the campaign title creators will see in the Bounty Hub.</p>
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="campaign-brief" className={labelStyle}>Campaign Brief <span style={{ color: NEON }}>*</span></label>
              <span className="text-[11px] text-white/55 tabular-nums">{settings.description.length} / 300</span>
            </div>
            <textarea id="campaign-brief" required maxLength={300}
              style={{ ...fieldStyle, minHeight: "132px", resize: "vertical" } as React.CSSProperties}
              value={settings.description} onChange={e => onChange({ description: e.target.value })}
              placeholder="Tell creators what makes your game worth playing and what you'd love them to capture." />
            <p className={helperStyle}>Tell creators what makes your game worth playing and what you'd love them to capture.</p>
          </div>
        </div>
        <div>
          <label className={labelStyle}>Your Game</label>
          <div className="flex items-center gap-3">
            {gameImage ? <img src={gameImage} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" /> : (
              <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0" style={{ background: `rgba(183,255,24,0.10)` }}>
                <Gamepad2 className="w-6 h-6" style={{ color: NEON }} />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-black text-white truncate">{gameName}</div>
              <div className="text-[11px] text-white/60 mt-1 truncate">{studioName}</div>
              <div className="text-[10px] text-white/45 mt-1 truncate">{effectivePlatformLabels.join(" · ")}</div>
            </div>
          </div>
        </div>
        <div>
          <label className={labelStyle}>Launch</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            {([
              { value: "asap" as const, title: "Launch after approval" },
              { value: "scheduled" as const, title: "Schedule launch" },
            ]).map(option => {
              const selected = settings.startType === option.value;
              return (
                <button key={option.value} type="button" aria-pressed={selected}
                  onClick={() => onChange({ startType: option.value })}
                  className="flex flex-1 items-center gap-2 rounded-xl px-3.5 py-3 text-left transition-colors"
                  style={{ background: selected ? "#182817" : "#111923", border: `1px solid ${selected ? NEON : "rgba(255,255,255,0.12)"}` }}>
                  <span className="h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: selected ? NEON : "rgba(255,255,255,0.3)" }}>
                    {selected && <span className="h-1.5 w-1.5 rounded-full" style={{ background: NEON }} />}
                  </span>
                  <span className="text-xs font-black text-white">{option.title}</span>
                </button>
              );
            })}
          </div>
          {settings.startType === "scheduled" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <input aria-label="Launch date" type="date" min={tomorrowStr} style={{ ...fieldStyle, colorScheme: "dark" } as React.CSSProperties}
                value={settings.scheduledDate} onChange={e => onChange({ scheduledDate: e.target.value })} />
              <input aria-label="Launch time" type="time" style={{ ...fieldStyle, colorScheme: "dark" } as React.CSSProperties}
                value={settings.scheduledTime} onChange={e => onChange({ scheduledTime: e.target.value })} />
              <select aria-label="Launch time zone" style={{ ...fieldStyle, paddingRight: "28px" } as React.CSSProperties}
                value={settings.timeZone} onChange={e => onChange({ timeZone: e.target.value })}>
                {timeZoneOptions.map(zone => <option key={zone} value={zone}>{zone}</option>)}
              </select>
            </div>
          )}
        </div>
        <AccessMethodSelector settings={settings} onChange={onChange} />
        <div>
          <div className={labelStyle}>Campaign Timing</div>
          <div className="grid grid-cols-2 gap-5 max-w-md">
            <div><div className="text-lg font-black text-white">{configuredApplicationPeriod} days</div><div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">Open for creators</div></div>
            <div><div className="text-lg font-black text-white">{configuredDuration} days</div><div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">Creator completion</div></div>
          </div>
          <p className={helperStyle}>Gamefolio recommended timing for Content Boost.</p>
        </div>
        <div>
          <div className={labelStyle}>Campaign Setup</div>
          <ul className="space-y-2.5 text-sm text-white/75">
            {preset && <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0" style={{ color: NEON }} /> {preset.estimatedCreatorMin}–{preset.estimatedCreatorMax} estimated creators</li>}
            {preset && <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0" style={{ color: NEON }} /> ~{preset.submissionMin}–{preset.submissionMax} estimated creator submissions</li>}
            <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0" style={{ color: NEON }} /> 4 deliverables per creator</li>
            <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0" style={{ color: NEON }} /> {configuredDuration}-day creator completion window</li>
            <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0" style={{ color: NEON }} /> Platforms matched to {gameName}</li>
            <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0" style={{ color: NEON }} /> {regionLabel} availability</li>
            <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0" style={{ color: NEON }} /> Gamefolio promotion included</li>
            <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0" style={{ color: NEON }} /> Seasonal Creator Reward Pool contribution</li>
          </ul>
        </div>
        <div>
          <button type="button" onClick={() => setAdvancedOpen(value => !value)}
            className="flex items-center gap-2 text-sm font-black text-white/75 hover:text-white transition-colors">
            <ChevronDown size={16} className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
            Advanced Settings
          </button>
          <p className="text-[11px] text-white/50 mt-1.5">Optional controls for developers who need more specific campaign restrictions.</p>
          {advancedOpen && (
            <div className="mt-4 space-y-5 border-t border-white/10 pt-5">
              <div>
                <div className={labelStyle}>Supported Platforms</div>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map(option => {
                    const selected = effectivePlatformIds.includes(option.id);
                    return <button key={option.id} type="button" aria-pressed={selected}
                      onClick={() => onChange({ platforms: selected ? effectivePlatformIds.filter(id => id !== option.id) : [...effectivePlatformIds, option.id] })}
                      className="rounded-lg px-3 py-2 text-[11px] font-bold"
                      style={{ background: selected ? "#182817" : "#111923", color: selected ? "#F4FFD7" : "rgba(255,255,255,0.72)", border: `1px solid ${selected ? NEON : "rgba(255,255,255,0.14)"}` }}>
                      {selected && <Check size={12} className="inline mr-1" style={{ color: NEON }} />}{option.label}
                    </button>;
                  })}
                </div>
              </div>
              <div>
                <label htmlFor="eligible-region-preset" className={labelStyle}>Eligible Region</label>
                <select id="eligible-region-preset" style={{ ...fieldStyle, paddingRight: "32px" } as React.CSSProperties}
                  value={settings.regions} onChange={e => onChange({ regions: e.target.value })}>
                  {REGION_OPTIONS.map(region => <option key={region.id} value={region.id}>{region.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="application-period-preset" className={labelStyle}>Campaign Application Period</label>
                <select id="application-period-preset" style={{ ...fieldStyle, paddingRight: "32px" } as React.CSSProperties}
                  value={settings.applicationPeriod} onChange={e => onChange({ applicationPeriod: Number(e.target.value) })}>
                  {[7, 14, 30, 60, 90].map(days => <option key={days} value={days}>{days} days</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Current() {
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const updateSettings = (changes: Partial<Settings>) => setSettings(current => ({ ...current, ...changes }));

  return (
    <main className="campaign-personalise-preview min-h-screen px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[1040px] rounded-2xl p-5 sm:p-8"
        style={{ background: "#0e1520", border: "1px solid rgba(255,255,255,0.10)" }}>
        <StepCard>
          <div>
            <PresetPersonalise settings={settings} onChange={updateSettings} />
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-8">
              <button type="button" className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-bold transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9FF1A]"
                style={{ background: "#111923", color: "rgba(255,255,255,0.70)", border: "1px solid rgba(255,255,255,0.16)" }}>Back</button>
              <button type="button" className="w-full sm:w-[290px] px-5 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9FF1A]"
                style={{ background: NEON, color: "#070b10", border: "1px solid transparent" }}>
                Continue to Upload Keys <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </StepCard>
      </div>
    </main>
  );
}