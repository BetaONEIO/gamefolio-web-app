import { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, Clock3, Film, KeyRound, Rocket, Sliders, Users, Zap } from "lucide-react";
import { CAMPAIGN_COMMERCIAL_MODEL, calculateCampaignEstimate } from "@shared/campaign-commercial-model";
import type { CommercialPreset } from "@shared/campaign-commercial-model";
import type { CampaignType } from "./CreateCampaignFlow";

const NEON = "#B7FF18";
const SURFACE = "#111923";
const ICONS = { "quick-creator": Zap, "content-boost": Film, "creator-showcase": Rocket, "custom-campaign": Sliders };

function money(pence: number) {
  return `£${Math.round(pence / 100)}`;
}

function dateLabel(value: string | null) {
  if (!value) return "your next billing reset";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(new Date(value));
}

export default function CommercialCampaignAccordion({
  selectedType, onSelect, onContinue, onBack, campaignTypes, allowance, commercialModel,
  budgetPence, onBudgetChange, allowanceLoading,
}: {
  selectedType: CampaignType | null;
  onSelect: (type: CampaignType) => void;
  onContinue: () => void;
  onBack: () => void;
  campaignTypes: CampaignType[];
  allowance?: { available?: boolean; used?: boolean; periodEnd?: string | null };
  commercialModel?: { presets?: readonly CommercialPreset[] };
  budgetPence: number;
  onBudgetChange: (budgetPence: number) => void;
  allowanceLoading?: boolean;
}) {
  const [expanded, setExpanded] = useState<string>("quick-creator");
  const presets = commercialModel?.presets ?? CAMPAIGN_COMMERCIAL_MODEL.presets as readonly CommercialPreset[];
  const customEstimate = useMemo(() => calculateCampaignEstimate(budgetPence), [budgetPence]);

  return (
    <div className="space-y-3" role="region" aria-label="Campaign types">
      <div className="rounded-xl px-4 py-3 mb-5" style={{ background: "#0D151E", border: "1px solid rgba(183,255,24,.22)" }}>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[.16em] font-bold text-white/55">
          <Check size={13} style={{ color: NEON }} /> Your Pro benefit
        </div>
        <p className="text-sm text-white mt-1">One small Quick Creator campaign is included each billing month. Larger campaigns are paid growth options.</p>
      </div>
      {presets.map((preset) => {
        const type = campaignTypes.find((item) => item.slug === preset.slug);
        if (!type) return null;
        const Icon = ICONS[preset.slug];
        const open = expanded === preset.slug;
        const selected = selectedType?.slug === preset.slug;
        const included = preset.slug === "quick-creator";
        const paidLabel = preset.priceFromPence
          ? `FROM ${money(preset.priceFromPence)}`
          : allowanceLoading
            ? "CHECKING PRO BENEFIT"
            : allowance?.used
              ? "MONTHLY BOUNTY USED"
              : allowance?.available
                ? "1 INCLUDED / MONTH"
                : "PRO REQUIRED";
        return (
          <section key={preset.slug} className="overflow-hidden rounded-2xl" style={{ background: selected ? "#152218" : SURFACE, border: `1px solid ${selected ? NEON : open ? "rgba(255,255,255,.24)" : "rgba(255,255,255,.11)"}` }}>
            <button type="button" aria-expanded={open} aria-controls={`commercial-${preset.slug}`} onClick={() => setExpanded(open ? "" : preset.slug)}
              className="w-full px-4 sm:px-5 py-4 flex flex-wrap items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B7FF18]" style={{ background: open ? "#17212B" : "transparent" }}>
              <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ color: NEON, background: "rgba(183,255,24,.10)" }}><Icon size={21} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><span className="block text-base sm:text-lg font-black text-white">{preset.slug === "custom-campaign" ? "Build Your Own" : type.shortName}</span><span className="block text-xs text-white/60 mt-1">{preset.overview}</span></span>
              <span className="text-[10px] font-black tracking-[.08em] px-2.5 py-1 rounded-md whitespace-nowrap" style={{ background: included ? NEON : "rgba(255,255,255,.10)", color: included ? "#071013" : "#fff" }}>{paidLabel}</span>
              <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "rgba(255,255,255,.55)" }} />
              <span className="basis-full grid grid-cols-3 gap-2 sm:flex sm:basis-auto sm:gap-6 pl-14 sm:pl-0">
                {[["CREATOR REACH", preset.creatorReach], ["EST. CONTENT", preset.estimatedContent], ["CAMPAIGN LENGTH", preset.campaignLength]].map(([label, value]) => <span key={label} className="flex flex-col"><strong className="text-xs sm:text-sm text-white">{value}</strong><small className="text-[9px] tracking-wider text-white/45 mt-1">{label}</small></span>)}
              </span>
            </button>
            {open && <div id={`commercial-${preset.slug}`} className="px-4 sm:px-16 pb-5 pt-2 border-t border-white/10">
              <div className="grid lg:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div><div className="text-[10px] uppercase tracking-[.16em] font-bold text-white/45 mb-2">CAMPAIGN OVERVIEW</div><p className="text-sm text-white/75 leading-relaxed">{preset.overview} Estimates are directional, not guarantees.</p></div>
                  {preset.slug === "custom-campaign" && <div className="rounded-xl p-4" style={{ background: "#0D151E" }}>
                    <div className="flex justify-between text-xs font-bold text-white"><span>Budget</span><span style={{ color: NEON }}>{money(budgetPence)}+</span></div>
                    <input aria-label="Campaign budget" type="range" min={CAMPAIGN_COMMERCIAL_MODEL.paidMinimumPence} max={CAMPAIGN_COMMERCIAL_MODEL.sliderMaximumPence} step={500} value={budgetPence} onChange={(event) => onBudgetChange(Number(event.target.value))} className="w-full accent-[#B7FF18] mt-3" />
                    <div className="flex justify-between text-[10px] text-white/45 mt-1"><span>£10</span><span>£100+</span></div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
                      <span><b className="block text-white">{customEstimate.creators.min}–{customEstimate.creators.max}</b><small className="text-white/45">EST. CREATORS</small></span>
                      <span><b className="block text-white">{customEstimate.totalContent.min}–{customEstimate.totalContent.max}</b><small className="text-white/45">EST. CONTENT</small></span>
                      <span><b className="block text-white">{customEstimate.suggestedDurationDays} days</b><small className="text-white/45">RECOMMENDED</small></span>
                      <span><b className="block text-white">{customEstimate.recommendedKeys.min}–{customEstimate.recommendedKeys.max}</b><small className="text-white/45">GAME KEYS</small></span>
                    </div>
                    <div className="mt-4 border-t border-white/10 pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Suggested content mix</p>
                      <p className="mt-1 text-xs leading-5 text-white/65">
                        {Object.entries(customEstimate.content).filter(([, quantity]) => quantity > 0).map(([type, quantity]) => `${quantity} ${type}`).join(" · ")}
                      </p>
                      <p className="mt-2 text-xs text-white/55">{money(Math.round(budgetPence * CAMPAIGN_COMMERCIAL_MODEL.rewardPoolContributionRate))} contributes to the seasonal Creator Reward Pool.</p>
                    </div>
                  </div>}
                  <div><div className="text-[10px] uppercase tracking-[.16em] font-bold text-white/45 mb-2">ESTIMATED OUTPUT</div><div className="flex flex-wrap gap-2"><span className="rounded-md bg-white/5 px-3 py-2 text-xs text-white"><Users size={13} className="inline mr-1" />{preset.creatorReach}</span><span className="rounded-md bg-white/5 px-3 py-2 text-xs text-white"><Film size={13} className="inline mr-1" />{preset.estimatedContent}</span><span className="rounded-md bg-white/5 px-3 py-2 text-xs text-white"><Clock3 size={13} className="inline mr-1" />{preset.campaignLength}</span></div></div>
                </div>
                <div className="space-y-4">
                  <div><div className="text-[10px] uppercase tracking-[.16em] font-bold text-white/45 mb-2">CREATOR CONTENT</div><div className="flex flex-wrap gap-2">{preset.content.map(item => <span key={item} className="text-xs text-white/75 px-2.5 py-1.5 rounded-md bg-white/5"><Check size={12} className="inline mr-1" style={{ color: NEON }} />{item}</span>)}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[.16em] font-bold text-white/45 mb-2">GAMEFOLIO INCLUDES</div><p className="text-xs leading-6 text-white/65">Bounty Hub listing · Creator discovery · Game key distribution · Campaign analytics · Gamefolio promotion · Contribution to the seasonal Creator Reward Pool</p><p className="text-xs text-white/40 mt-2"><KeyRound size={12} className="inline mr-1" />Creator Rewards: up to {type.slug === "creator-showcase" ? "15,000" : type.slug === "content-boost" ? "7,500" : "3,000"} Bounty XP available</p></div>
                  <div><div className="text-[10px] uppercase tracking-[.16em] font-bold text-white/45 mb-2">BEST FOR</div><p className="text-xs text-white/65">{preset.bestFor.join(" · ")}</p></div>
                  {included && <p className="text-xs text-white/55">{allowanceLoading ? "Checking your current billing-month benefit…" : allowance?.used ? `Monthly campaign used. Next available ${dateLabel(allowance.periodEnd ?? null)}.` : allowance?.available ? "Available now. Unused campaigns do not roll over." : "An active Indie Game Pro subscription is required for the included monthly campaign."}</p>}
                  <button type="button" disabled={included && !allowance?.used && !allowance?.available} onClick={() => {
                    if (included && allowance?.used) {
                      setExpanded("content-boost");
                      return;
                    }
                    if (preset.priceFromPence && preset.slug !== "custom-campaign") {
                      onBudgetChange(preset.priceFromPence);
                    }
                    onSelect(type);
                  }} aria-pressed={selected} className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-black inline-flex items-center justify-center gap-2 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF18]" style={{ background: selected ? "#263a25" : NEON, color: selected ? NEON : "#071013", border: selected ? `1px solid ${NEON}` : "0" }}>{included ? (allowance?.used ? "Explore Paid Campaigns" : allowance?.available ? "Use Monthly Bounty" : "Indie Game Pro required") : preset.slug === "custom-campaign" ? "Build Your Own" : `Choose ${type.shortName}`} <ArrowRight size={15} /></button>
                </div>
              </div>
            </div>}
          </section>
        );
      })}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-4"><button type="button" onClick={onBack} className="px-5 py-3 rounded-xl text-sm font-bold text-white/65 border border-white/15 bg-[#111923]">Back</button><button type="button" onClick={onContinue} disabled={!selectedType} className="px-6 py-3 rounded-xl text-sm font-black disabled:opacity-50" style={{ background: NEON, color: "#071013" }}>{selectedType ? `Continue with ${selectedType.shortName}` : "Select a campaign to continue"} <ArrowRight size={15} className="inline ml-1" /></button></div>
    </div>
  );
}