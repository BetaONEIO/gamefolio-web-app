import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Loader2, Zap, ShieldCheck, CheckCircle2,
  Repeat, Clock, Play, Pause,
  ChevronRight, Info, Crown, Target,
} from "lucide-react";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";

const FREQUENCIES = [
  { value: "immediate", label: "Immediately after completion" },
  { value: "weekly",    label: "Weekly" },
  { value: "biweekly",  label: "Fortnightly" },
  { value: "monthly",   label: "Monthly" },
];

export default function AutoCampaignSettingsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isSubscriber = !!user?.isIndieDevSubscriber;

  // Fetch settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery<{
    enabled: boolean;
    settings: {
      allowedTemplates?: number[];
      frequency?: string;
      maxCreatorsPerCampaign?: number;
      minKeyReserve?: number;
    } | null;
  }>({
    queryKey: ["/api/campaigns/auto/settings"],
    enabled: true,
  });

  // Fetch templates (to show checkboxes)
  const { data: templatesData, isLoading: templatesLoading } = useQuery<{
    id: number; name: string; slug: string; duration: number;
    participant_capacity: number; estimated_clips: number;
  }[]>({
    queryKey: ["/api/campaigns/templates"],
    enabled: true,
  });

  // Fetch auto-campaign history
  const { data: queueData, isLoading: queueLoading } = useQuery<{
    id: number; template_name: string; duration: number;
    created_at: string; status: string;
  }[]>({
    queryKey: ["/api/campaigns/auto/queue"],
    enabled: true,
  });

  // Local form state
  const [enabled, setEnabled] = useState(false);
  const [allowedTemplates, setAllowedTemplates] = useState<number[]>([]);
  const [frequency, setFrequency] = useState("weekly");
  const [maxCreators, setMaxCreators] = useState(20);
  const [minReserve, setMinReserve] = useState(10);

  // Sync from server
  useEffect(() => {
    if (!settingsData) return;
    const s = settingsData.settings ?? {};
    setEnabled(settingsData.enabled ?? false);
    setAllowedTemplates(s.allowedTemplates ?? []);
    setFrequency(s.frequency ?? "weekly");
    setMaxCreators(s.maxCreatorsPerCampaign ?? 20);
    setMinReserve(s.minKeyReserve ?? 10);
  }, [settingsData]);

  const templates = (templatesData as any[]) ?? [];
  const queue = (queueData as any[]) ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/campaigns/auto/settings", {
        enabled,
        allowedTemplates,
        frequency,
        maxCreatorsPerCampaign: maxCreators,
        minKeyReserve: minReserve,
        keyPoolSize: 50,
        gameName: user?.displayName ?? "",
        gameArtworkUrl: user?.avatarUrl ?? "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/auto/settings"] });
      toast({ title: "Settings saved", description: "Auto Campaign preferences updated." });
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not update settings.", variant: "destructive" });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/campaigns/auto/trigger", {}),
    onSuccess: (res: any) => {
      toast({
        title: res.created ? "Campaign launched" : "No campaign created",
        description: res.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/auto/queue"] });
    },
    onError: () => {
      toast({ title: "Trigger failed", variant: "destructive" });
    },
  });

  if (!isSubscriber) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-2xl p-6 mb-8"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(183,255,24,0.09)" }}>
              <Crown className="h-5 w-5" style={{ color: NEON }} />
            </div>
            <h3 className="text-lg font-black text-white">Auto Campaigns</h3>
          </div>
          <p className="text-sm text-white/50 mb-4">
            Auto Campaigns are a Game Developer feature. Enable this to let Gamefolio
            continuously promote your game — creating campaigns, recruiting creators, and
            distributing keys automatically.
          </p>
          <button
            onClick={() => toast({ title: "Upgrade coming soon", description: "Please visit the Subscription tab to upgrade." })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110"
            style={{ background: NEON, color: "#070b10" }}>
            Upgrade to Game Developer <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const isLoading = settingsLoading || templatesLoading;

  return (
    <div className="max-w-3xl space-y-6">

      {/* Header card */}
      <div className="rounded-2xl p-6"
        style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(183,255,24,0.09)" }}>
            <Zap className="h-5 w-5" style={{ color: NEON }} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Auto Campaigns</h3>
            <p className="text-xs text-white/40">Gamefolio promotes your game automatically</p>
          </div>
        </div>
        <p className="text-sm text-white/50">
          Upload your keys, choose which campaign types Gamefolio may use, set safety limits,
          and walk away. Gamefolio will create campaigns, recruit creators, distribute keys,
          and award full game rewards on your behalf.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} />
        </div>
      ) : (
        <>
          {/* Enable toggle */}
          <div className="rounded-2xl p-6"
            style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {enabled ? (
                  <Play className="w-5 h-5" style={{ color: "#4ade80" }} />
                ) : (
                  <Pause className="w-5 h-5" style={{ color: "#94a3b8" }} />
                )}
                <div>
                  <p className="text-sm font-bold text-white">
                    {enabled ? "Auto Campaigns enabled" : "Auto Campaigns disabled"}
                  </p>
                  <p className="text-xs text-white/40">
                    {enabled
                      ? "Gamefolio will create campaigns automatically based on your settings."
                      : "Enable to let Gamefolio run campaigns for you."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className="relative w-12 h-7 rounded-full transition-colors"
                style={{ background: enabled ? NEON : "rgba(255,255,255,0.15)" }}>
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>

          {/* Template selection */}
          <div className="rounded-2xl p-6"
            style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" style={{ color: NEON }} />
              Allowed Campaign Types
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.filter((t: any) => t.slug !== "custom").map((t: any) => {
                const checked = allowedTemplates.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => setAllowedTemplates(prev =>
                      checked ? prev.filter(id => id !== t.id) : [...prev, t.id]
                    )}
                    className="flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                    style={{
                      background: checked ? "rgba(183,255,24,0.08)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${checked ? "rgba(183,255,24,0.25)" : CARD_BORDER}`,
                    }}>
                    <div className="mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        background: checked ? NEON : "rgba(255,255,255,0.1)",
                        border: checked ? "none" : "1px solid rgba(255,255,255,0.2)",
                      }}>
                      {checked && <CheckCircle2 className="w-3 h-3" style={{ color: "#070b10" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{t.name}</p>
                      <p className="text-[10px] text-white/40 truncate">{t.duration}d · {t.participant_capacity} creators · {t.estimated_clips} clips</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frequency + safety limits */}
          <div className="rounded-2xl p-6"
            style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Repeat className="w-4 h-4" style={{ color: NEON }} />
              Frequency & Safety
            </h4>

            <div className="space-y-5">
              {/* Frequency */}
              <div>
                <label className="text-xs font-bold text-white/60 mb-2 block">Campaign Frequency</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FREQUENCIES.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setFrequency(f.value)}
                      className="px-3 py-2 rounded-lg text-xs font-bold text-left transition-all"
                      style={{
                        background: frequency === f.value ? "rgba(183,255,24,0.1)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${frequency === f.value ? "rgba(183,255,24,0.3)" : CARD_BORDER}`,
                        color: frequency === f.value ? NEON : "rgba(255,255,255,0.6)",
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max creators */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-white/60">Max Creators per Campaign</label>
                  <span className="text-xs font-black" style={{ color: NEON }}>{maxCreators}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  value={maxCreators}
                  onChange={e => setMaxCreators(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: NEON }}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-white/30">5</span>
                  <span className="text-[10px] text-white/30">50</span>
                </div>
              </div>

              {/* Min key reserve */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-white/60">Minimum Key Reserve</label>
                  <span className="text-xs font-black" style={{ color: NEON }}>{minReserve}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={minReserve}
                  onChange={e => setMinReserve(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: NEON }}
                />
                <p className="text-[10px] text-white/30 mt-1">
                  Auto campaigns pause when your pool drops below this reserve.
                </p>
              </div>
            </div>
          </div>

          {/* Save + Trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 disabled:opacity-50"
              style={{ background: NEON, color: "#070b10" }}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Save Settings
            </button>
            <button
              onClick={() => triggerMutation.mutate()}
              disabled={triggerMutation.isPending || !enabled}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-30"
              style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: `1px solid ${CARD_BORDER}` }}>
              {triggerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Test Launch
            </button>
          </div>

          {/* Safety info */}
          <div className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: "rgba(183,255,24,0.04)", border: "1px solid rgba(183,255,24,0.12)" }}>
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: NEON }} />
            <div className="text-xs text-white/50 leading-relaxed">
              Safety limits are enforced server-side:
              max <strong className="text-white">3 simultaneous auto-campaigns</strong>,
              campaigns only launch when keys exceed reserve,
              and stopping auto-campaigns does not affect already-running campaigns.
            </div>
          </div>

          {/* Queue / History */}
          <div className="rounded-2xl p-6"
            style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: NEON }} />
              Auto Campaign History
            </h4>
            {queueLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: NEON }} />
              </div>
            ) : queue.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: NEON }} />
                <p className="text-sm text-white/30">No auto-campaigns yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((q: any) => (
                  <div key={q.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${CARD_BORDER}` }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: q.status === "live" ? "rgba(183,255,24,0.12)" : "rgba(255,255,255,0.06)" }}>
                      {q.status === "live" ? (
                        <Play className="w-4 h-4" style={{ color: NEON }} />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" style={{ color: "#4ade80" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{q.template_name}</p>
                      <p className="text-[10px] text-white/40">
                        {q.duration}d · {new Date(q.created_at).toLocaleDateString()} · <span className="uppercase">{q.status}</span>
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
