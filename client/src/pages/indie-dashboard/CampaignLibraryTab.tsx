import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2, ShieldCheck, Star, TrendingUp, Clock, Users, Key,
  Target, Film, Camera, MessageSquare, Zap, ChevronRight, X,
} from "lucide-react";
import { SiSteam } from "react-icons/si";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";

const CATEGORY_LABELS: Record<string, string> = {
  all: "All Campaigns",
  demo_promotion: "Demo Promotion",
  game_launch: "Game Launch",
  content_generation: "Content Generation",
  streaming: "Streaming",
  screenshots: "Screenshots",
  reviews_feedback: "Reviews & Feedback",
  community_growth: "Community Growth",
  updates_dlc: "Updates & DLC",
  bug_testing: "Bug Testing",
};

const CATEGORY_FILTERS = Object.entries(CATEGORY_LABELS);

const STATUS_BADGES: Record<string, { label: string; color: string; bg: string; icon?: any }> = {
  available: { label: "Available", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  popular: { label: "Popular", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: TrendingUp },
  recommended: { label: "Recommended", color: NEON, bg: "rgba(183,255,24,0.12)", icon: Star },
  coming_soon: { label: "Coming Soon", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  inactive: { label: "Inactive", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

function getBadge(t: any) {
  if (t.recommended) return STATUS_BADGES.recommended;
  if (t.featured) return STATUS_BADGES.popular;
  return STATUS_BADGES[t.status] ?? STATUS_BADGES.available;
}

function TemplateDetailModal({ template, onClose, onRun }: { template: any; onClose: () => void; onRun: () => void }) {
  const badge = getBadge(template);
  const bounties: any[] = template.bounties ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: "#0d1520", border: "1px solid rgba(255,255,255,0.12)" }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative p-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={onClose} className="absolute top-5 right-5 p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
          <div className="flex items-start gap-3 pr-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ color: badge.color, background: badge.bg }}>
                  {badge.icon && <badge.icon size={9} />}
                  {badge.label}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#B7FF18]">
                  <ShieldCheck size={10} /> Gamefolio Verified
                </span>
              </div>
              <h2 className="text-xl font-black text-white">{template.name}</h2>
              <p className="text-sm text-white/50 mt-1">{template.description}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Key specs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Duration", value: `${template.duration} Days`, icon: Clock },
              { label: "Participants", value: template.participant_capacity, icon: Users },
              { label: "Demo Keys", value: template.demo_keys_required > 0 ? template.demo_keys_required : "None", icon: Key },
              { label: "Full Keys", value: template.full_keys_required > 0 ? template.full_keys_required : "None", icon: Key },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                <Icon size={14} className="mx-auto mb-1.5 text-white/30" />
                <div className="text-base font-black text-white">{value}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Best use case */}
          <div className="rounded-xl px-4 py-3" style={{ background: "rgba(183,255,24,0.05)", border: "1px solid rgba(183,255,24,0.15)" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#B7FF18] mb-1">Best For</div>
            <div className="text-sm text-white">{template.best_use_case}</div>
          </div>

          {/* Bounties */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Campaign Bounties</div>
            <div className="space-y-2">
              {bounties.map((b: any, i: number) => (
                <div key={b.id ?? i} className="flex items-start gap-3 rounded-xl p-3"
                  style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                  <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black mt-0.5"
                    style={{ background: "rgba(183,255,24,0.15)", color: NEON }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{b.title}</span>
                      {b.mandatory && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(183,255,24,0.1)", color: NEON }}>
                          MANDATORY
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5">{b.description}</div>
                  </div>
                  <div className="shrink-0 text-[11px] font-bold" style={{ color: NEON }}>+{b.xp_reward?.toLocaleString()} XP</div>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated output */}
          {(template.estimated_clips > 0 || template.estimated_screenshots > 0 || template.estimated_feedback > 0) && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Estimated Output</div>
              <div className="flex flex-wrap gap-3">
                {template.estimated_clips > 0 && (
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                    <Film size={13} className="text-white/40" />
                    <span className="text-sm text-white">Up to <strong>{template.estimated_clips}</strong> clips</span>
                  </div>
                )}
                {template.estimated_screenshots > 0 && (
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                    <Camera size={13} className="text-white/40" />
                    <span className="text-sm text-white">Up to <strong>{template.estimated_screenshots}</strong> screenshots</span>
                  </div>
                )}
                {template.estimated_feedback > 0 && (
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                    <MessageSquare size={13} className="text-white/40" />
                    <span className="text-sm text-white"><strong>{template.estimated_feedback}</strong> feedback submissions</span>
                  </div>
                )}
                {(template.estimated_views_min > 0 || template.estimated_views_max > 0) && (
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                    <Zap size={13} className="text-white/40" />
                    <span className="text-sm text-white"><strong>{(template.estimated_views_min ?? 0).toLocaleString()}–{(template.estimated_views_max ?? 0).toLocaleString()}</strong> views</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Completion reward */}
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Completion Reward</div>
            <div className="text-sm text-white">{template.completion_reward_description ?? "Reward on verified completion"}</div>
          </div>

          {/* What devs can't change */}
          <div className="text-[11px] text-white/25 space-y-0.5">
            <div className="font-bold text-white/30 mb-1">Gamefolio manages: duration · XP values · bounty rules · moderation · reward distribution</div>
            You choose the game, upload the keys, pick a start date. Gamefolio handles the rest.
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-5 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={onRun}
            className="flex-1 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110"
            style={{ background: NEON, color: "#070b10" }}>
            <Target size={15} />
            Run Campaign
          </button>
          <button onClick={onClose}
            className="px-5 py-3 rounded-xl text-sm font-bold text-white/60 border border-white/10 hover:text-white transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignCard({ template, onDetails, onRun }: { template: any; onDetails: () => void; onRun: () => void }) {
  const badge = getBadge(template);
  const bounties: any[] = template.bounties ?? [];

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-xl"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      {/* Card header band */}
      <div className="h-1.5 w-full" style={{ background: badge.recommended ? NEON : badge.color, opacity: 0.7 }} />

      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Title row */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ color: badge.color, background: badge.bg }}>
              {badge.icon && <badge.icon size={9} />}
              {badge.label}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#B7FF18]">
              <ShieldCheck size={9} /> Verified
            </span>
          </div>
          <h3 className="text-base font-black text-white leading-tight">{template.name}</h3>
          <p className="text-[12px] text-white/45 mt-1 line-clamp-2">{template.description}</p>
        </div>

        {/* Specs grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Clock size={11} className="mx-auto mb-0.5 text-white/30" />
            <div className="text-xs font-black text-white">{template.duration}d</div>
            <div className="text-[9px] text-white/30 uppercase">Duration</div>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Users size={11} className="mx-auto mb-0.5 text-white/30" />
            <div className="text-xs font-black text-white">{template.participant_capacity}</div>
            <div className="text-[9px] text-white/30 uppercase">Players</div>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Target size={11} className="mx-auto mb-0.5 text-white/30" />
            <div className="text-xs font-black text-white">{bounties.length}</div>
            <div className="text-[9px] text-white/30 uppercase">Bounties</div>
          </div>
        </div>

        {/* Keys required */}
        {(template.demo_keys_required > 0 || template.full_keys_required > 0) && (
          <div className="flex gap-2">
            {template.demo_keys_required > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-white/60"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${CARD_BORDER}` }}>
                <Key size={10} /> {template.demo_keys_required} Demo Keys
              </div>
            )}
            {template.full_keys_required > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-white/60"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${CARD_BORDER}` }}>
                <Key size={10} /> {template.full_keys_required} Full Keys
              </div>
            )}
          </div>
        )}

        {/* Bounty pills */}
        <div className="flex flex-wrap gap-1.5">
          {bounties.slice(0, 3).map((b: any, i: number) => (
            <span key={i} className="text-[10px] px-2 py-1 rounded-full text-white/50"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${CARD_BORDER}` }}>
              {b.title}
            </span>
          ))}
          {bounties.length > 3 && (
            <span className="text-[10px] px-2 py-1 rounded-full text-white/30"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              +{bounties.length - 3} more
            </span>
          )}
        </div>

        {/* Estimated output */}
        {(template.estimated_clips > 0 || template.estimated_screenshots > 0) && (
          <div className="text-[11px] text-white/30">
            Est.{template.estimated_clips > 0 ? ` ${template.estimated_clips} clips` : ""}
            {template.estimated_screenshots > 0 ? ` · ${template.estimated_screenshots} screenshots` : ""}
            {template.estimated_feedback > 0 ? ` · ${template.estimated_feedback} feedback` : ""}
          </div>
        )}

        <div className="flex-1" />

        {/* CTAs */}
        <div className="flex gap-2 pt-1">
          <button onClick={onRun}
            className="flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all hover:brightness-110"
            style={{ background: NEON, color: "#070b10" }}>
            <Target size={12} /> Run Campaign
          </button>
          <button onClick={onDetails}
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold text-white/50 border border-white/10 hover:text-white transition-colors">
            Details <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CampaignLibraryTab({ onRunCampaign }: { onRunCampaign: (template: any) => void }) {
  const [category, setCategory] = useState("all");
  const [detailTemplate, setDetailTemplate] = useState<any>(null);

  const { data: templates = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/campaigns/templates"],
  });

  const filtered = category === "all" ? templates : templates.filter(t => t.category === category);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-5" style={{ background: "rgba(183,255,24,0.05)", border: "1px solid rgba(183,255,24,0.2)" }}>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={16} style={{ color: NEON }} />
          <span className="text-sm font-black text-white">Gamefolio Verified Campaigns</span>
        </div>
        <p className="text-[12px] text-white/50 leading-relaxed">
          Choose a proven campaign, provide your keys, and Gamefolio runs the bounties for you.
          All rules, XP values and moderation are handled by Gamefolio — you just select the package that fits your goal.
        </p>
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORY_FILTERS.map(([key, label]) => (
          <button key={key} onClick={() => setCategory(key)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
            style={{
              background: category === key ? "rgba(183,255,24,0.15)" : CARD_BG,
              color: category === key ? NEON : "rgba(255,255,255,0.45)",
              border: `1px solid ${category === key ? "rgba(183,255,24,0.35)" : CARD_BORDER}`,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Campaign grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          No campaigns in this category yet.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(template => (
            <CampaignCard
              key={template.id}
              template={template}
              onDetails={() => setDetailTemplate(template)}
              onRun={() => onRunCampaign(template)}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {detailTemplate && (
        <TemplateDetailModal
          template={detailTemplate}
          onClose={() => setDetailTemplate(null)}
          onRun={() => { setDetailTemplate(null); onRunCampaign(detailTemplate); }}
        />
      )}
    </div>
  );
}
