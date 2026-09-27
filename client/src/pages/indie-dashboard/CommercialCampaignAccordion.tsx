import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Rocket, Sliders, Sparkles, Zap } from "lucide-react";
import { CAMPAIGN_COMMERCIAL_MODEL, getPresetSubmissionEstimate } from "@shared/campaign-commercial-model";
import type { CommercialPreset } from "@shared/campaign-commercial-model";
import type { CampaignType } from "./CreateCampaignFlow";

const NEON = "#B7FF18";
const SURFACE = "#111923";
const ICONS = { "quick-creator": Zap, "content-boost": Sparkles, "creator-showcase": Rocket, "custom-campaign": Sliders };

function money(pence: number) {
  return `£${Math.round(pence / 100)}`;
}

function dateLabel(value: string | null) {
  if (!value) return "your next billing reset";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(new Date(value));
}

function benefitsFor(preset: CommercialPreset): string[] {
  if (preset.slug === "quick-creator") {
    return ["Creator access", "Gameplay content", "Reels and screenshots", "Game key distribution", "Gamefolio promotion", "Bounty Hub exposure"];
  }
  if (preset.slug === "content-boost") {
    return ["More creators playing your game", "Gameplay clips", "Vertical reels", "Screenshots", "Creator feedback", "Gamefolio promotion", "Campaign analytics"];
  }
  if (preset.slug === "creator-showcase") {
    return ["Larger creator push", "Gameplay clips", "Vertical reels", "Screenshots", "Livestream opportunities", "Creator reviews", "Enhanced Gamefolio promotion", "Featured Bounty Hub visibility"];
  }
  return ["Start from £10", "Choose your budget", "Estimated content updates automatically", "Choose your content priorities", "Recommended campaign length and game keys", "Seasonal Creator Reward Pool contribution"];
}

export default function CommercialCampaignAccordion({
  selectedType, onSelect, onContinue, onBack, campaignTypes, allowance, commercialModel,
  allowanceLoading, gameArtworkUrl,
}: {
  selectedType: CampaignType | null;
  onSelect: (type: CampaignType) => void;
  onContinue: () => void;
  onBack: () => void;
  campaignTypes: CampaignType[];
  allowance?: { available?: boolean; used?: boolean; periodEnd?: string | null };
  commercialModel?: { presets?: readonly CommercialPreset[] };
  allowanceLoading?: boolean;
  gameArtworkUrl?: string | null;
}) {
  const [expanded, setExpanded] = useState<string>("quick-creator");
  const presets = commercialModel?.presets ?? CAMPAIGN_COMMERCIAL_MODEL.presets as readonly CommercialPreset[];

  return (
    <div className="space-y-3" role="region" aria-label="Campaign types">
      {presets.map((preset) => {
        const type = campaignTypes.find((item) => item.slug === preset.slug);
        if (!type) return null;
        const Icon = ICONS[preset.slug];
        const open = expanded === preset.slug;
        const selected = selectedType?.slug === preset.slug;
        const included = preset.slug === "quick-creator";
        const estimate = getPresetSubmissionEstimate(preset);
        const paidLabel = preset.priceFromPence ? `FROM ${money(preset.priceFromPence)}` : "INCLUDED WITH PRO";
        const benefits = benefitsFor(preset);

        return (
          <section key={preset.slug} className="overflow-hidden rounded-2xl transition-[border-color,box-shadow] duration-200"
            style={{ background: selected ? "#111d17" : SURFACE, border: `1px solid ${selected ? NEON : open ? "rgba(255,255,255,.24)" : "rgba(255,255,255,.11)"}`, boxShadow: selected ? "0 0 24px rgba(183,255,24,0.08)" : "none" }}>
            <button type="button" aria-expanded={open} aria-controls={`commercial-${preset.slug}`}
              onClick={() => setExpanded(open ? "" : preset.slug)}
              className="w-full px-4 sm:px-5 py-4 flex flex-wrap items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B7FF18]"
              style={{ background: open ? "#17212B" : "transparent" }}>
              <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ color: NEON, background: "rgba(183,255,24,.10)" }}>
                <Icon size={21} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base sm:text-lg font-black text-white">{preset.slug === "custom-campaign" ? "Build Your Own" : type.shortName}</span>
                <span className="block text-sm text-white/75 mt-1">{preset.overview}</span>
              </span>
              <span className="text-[10px] font-black tracking-[.08em] px-2.5 py-1 rounded-md whitespace-nowrap" style={{ background: included ? NEON : "rgba(255,255,255,.10)", color: included ? "#071013" : "#fff" }}>{paidLabel}</span>
              <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "rgba(255,255,255,.55)" }} />
            </button>

            {open && (
              <div id={`commercial-${preset.slug}`} role="region" aria-label={`${type.shortName} details`} className="border-t border-white/10">
                <div className="relative grid min-h-[410px] lg:grid-cols-[1.1fr_.9fr] overflow-hidden bg-[#0F101B]">
                  <div className="absolute inset-0 lg:relative lg:col-start-2 lg:row-start-1 min-h-[180px] lg:min-h-0"
                    style={gameArtworkUrl ? {
                      backgroundImage: `url("${gameArtworkUrl}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    } : { background: "#161c2a" }}>
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0F101B] via-[#0F101B]/70 to-[#0F101B] lg:bg-gradient-to-r lg:from-[#0F101B] lg:via-[#0F101B]/45 lg:to-transparent" />
                  </div>
                  <div className="relative z-10 flex flex-col justify-center px-5 py-9 sm:px-10 sm:py-10 lg:col-start-1 lg:row-start-1 lg:max-w-[680px]">
                    <p className="text-xs uppercase tracking-[.18em] font-black mb-3" style={{ color: NEON }}>{preset.label}</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{type.shortName}</h3>
                    <p className="mt-3 max-w-xl text-base sm:text-[17px] leading-7 text-white/90">{preset.overview}</p>

                    <div className="mt-7">
                      <p className="text-xs uppercase tracking-[.18em] font-black mb-4" style={{ color: NEON }}>WHAT YOU GET</p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3" aria-label={`${type.shortName} benefits`}>
                        {benefits.map((benefit) => (
                          <li key={benefit} className="flex items-start gap-2.5 text-[15px] leading-6 font-medium text-white">
                            <Check size={18} strokeWidth={3} className="mt-1 shrink-0" style={{ color: NEON }} aria-hidden="true" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {preset.slug !== "custom-campaign" && (
                      <div className="mt-7 border-t border-white/10 pt-5">
                        <p className="text-[11px] uppercase tracking-[.18em] font-black mb-3 text-white/65">ESTIMATED CAMPAIGN</p>
                        <div className="grid grid-cols-3 gap-4 max-w-lg">
                          <div>
                            <p className="text-lg sm:text-xl font-black text-white">{estimate ? `${estimate.creatorMin}–${estimate.creatorMax}` : "Dynamic"}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-wider text-white/55">CREATORS</p>
                          </div>
                          <div>
                            <p className="text-lg sm:text-xl font-black text-white">{estimate ? `~${estimate.submissionMin}–${estimate.submissionMax}` : "Budget-based"}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-wider text-white/55">CREATOR SUBMISSIONS</p>
                          </div>
                          <div>
                            <p className="text-lg sm:text-xl font-black text-white">{estimate?.durationDays ? `${estimate.durationDays} days` : "Recommended"}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-wider text-white/55">CAMPAIGN</p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-white/55">Directional estimates, not guarantees.</p>
                      </div>
                    )}

                    <div className="mt-7">
                      <p className="text-xs uppercase tracking-[.18em] font-black mb-2" style={{ color: NEON }}>BEST FOR</p>
                      <p className="text-[15px] leading-6 text-white/80">{preset.bestFor.join(" · ")}</p>
                    </div>

                    {included && (
                      <p className="mt-4 text-sm leading-6 text-white/75">
                        {allowanceLoading
                          ? "Checking your current billing-month benefit…"
                          : allowance?.used
                            ? `Monthly campaign used. Next available ${dateLabel(allowance.periodEnd ?? null)}.`
                            : allowance?.available
                              ? "Available now. Unused campaigns do not roll over."
                              : "An active Indie Game Pro subscription is required for the included monthly campaign."}
                      </p>
                    )}

                    <button type="button" disabled={included && !allowance?.used && !allowance?.available}
                      onClick={() => {
                        if (included && allowance?.used) {
                          setExpanded("content-boost");
                          return;
                        }
                        onSelect(type);
                      }}
                      aria-pressed={selected}
                      className="mt-8 w-full sm:w-[320px] min-h-[54px] px-6 py-4 rounded-xl text-base sm:text-lg font-black inline-flex items-center justify-center gap-2 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF18]"
                      style={{ background: NEON, color: "#0F101B" }}>
                      {included ? (allowance?.used ? "Explore Paid Campaigns" : allowance?.available ? "Use Monthly Bounty" : "Indie Game Pro required") : preset.slug === "custom-campaign" ? "Build Your Campaign" : `Choose ${type.shortName}`}
                      <ArrowRight size={19} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        );
      })}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
        <button type="button" onClick={onBack} className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-bold transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF18]"
          style={{ color: "rgba(255,255,255,0.72)", border: "1px solid rgba(255,255,255,0.14)", background: "#111923" }}>Back</button>
        <button type="button" onClick={onContinue} disabled={!selectedType}
          className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF18]"
          style={{ background: selectedType ? NEON : "#263039", color: selectedType ? "#070b10" : "rgba(255,255,255,0.78)", border: selectedType ? "1px solid transparent" : "1px solid rgba(255,255,255,0.16)" }}>
          {selectedType ? `Continue with ${selectedType.shortName} →` : "Select a campaign to continue"}
        </button>
      </div>
    </div>
  );
}