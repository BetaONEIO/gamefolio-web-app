import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, RefreshCw, CheckCircle2 } from "lucide-react";
import { NEON, CARD_BORDER } from "../../IndieDashboardPage";
import { formatFieldName, formatValue, type Profile, type SyncChange, type SyncDecision } from "./types";

interface SyncPanelProps {
  profile: Profile | null;
  onSynced: () => void;
}

export function SyncPanel({ profile, onSynced }: SyncPanelProps) {
  const { toast } = useToast();
  const [changes, setChanges] = useState<SyncChange[]>([]);
  const [source, setSource] = useState("");
  const [checked, setChecked] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, SyncDecision>>({});
  const [isChecking, setIsChecking] = useState(false);

  const setDecision = useCallback((fieldName: string, d: SyncDecision) => {
    setDecisions(prev => ({ ...prev, [fieldName]: d }));
  }, []);

  const doCheck = async () => {
    setIsChecking(true);
    try {
      const data = await (await apiRequest("POST", "/api/indie/sync-check")).json();
      const incoming: SyncChange[] = data.changes ?? [];
      setChanges(incoming); setSource(data.source ?? ""); setChecked(true);
      const auto: Record<string, SyncDecision> = {};
      for (const c of incoming) auto[c.fieldName] = c.hasOverride ? "keep" : "use";
      setDecisions(auto);
      if (!data.hasChanges) toast({ description: "Profile is up to date — no changes found." });
    } catch (err: any) {
      toast({ description: err?.message || "Could not check for updates. Add a Steam App ID or Epic slug first.", variant: "gamefolioError" });
    } finally { setIsChecking(false); }
  };

  const applyMutation = useMutation({
    mutationFn: async () => {
      const fields = changes
        .filter(c => decisions[c.fieldName] === "use")
        .map(c => ({ fieldName: c.fieldName, newValue: c.newValue }));
      return (await apiRequest("POST", "/api/indie/sync-apply", { fields, source })).json();
    },
    onSuccess: async (data: any) => {
      const n = data.applied?.length ?? 0;
      const sk = data.skipped?.length ?? 0;
      const deferred = changes.filter(c => decisions[c.fieldName] === "defer").length;
      const parts: string[] = [];
      if (n > 0) parts.push(`${n} field${n !== 1 ? "s" : ""} updated from store`);
      if (sk > 0) parts.push(`${sk} field${sk !== 1 ? "s" : ""} kept`);
      if (deferred > 0) parts.push(`${deferred} deferred`);
      toast({ description: parts.join(", ") + "." });
      await queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] });
      setChecked(false); setChanges([]); setDecisions({}); onSynced();
    },
    onError: () => toast({ description: "Sync failed.", variant: "gamefolioError" }),
  });

  const useCount = changes.filter(c => decisions[c.fieldName] === "use").length;
  const hasStore = !!(profile?.steamAppId || profile?.epicSlug);

  if (!hasStore) {
    return <p className="text-xs text-white/40 text-center py-3">Add a Steam App ID or Epic slug in Store Links to enable sync.</p>;
  }

  if (!checked) {
    return (
      <button onClick={doCheck} disabled={isChecking}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded text-sm font-bold transition-all"
        style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${CARD_BORDER}`, color: "white" }}>
        {isChecking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {isChecking ? "Checking for updates…" : `Check ${profile?.steamAppId ? "Steam" : "Epic"} for updates`}
      </button>
    );
  }

  if (changes.length === 0) {
    return (
      <p className="text-xs text-white/50 text-center py-3 flex items-center justify-center gap-1.5">
        <CheckCircle2 size={14} style={{ color: NEON }} /> Profile is up to date
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-white/70">{changes.length} update{changes.length !== 1 ? "s" : ""} from {source}</p>
        <div className="flex gap-2">
          <button onClick={() => { const d: Record<string, SyncDecision> = {}; for (const c of changes) d[c.fieldName] = c.hasOverride ? "keep" : "use"; setDecisions(d); }}
            className="text-[10px] text-white/50 hover:text-white">Auto</button>
          <button onClick={() => { const d: Record<string, SyncDecision> = {}; for (const c of changes) d[c.fieldName] = "keep"; setDecisions(d); }}
            className="text-[10px] text-white/50 hover:text-white">Keep all</button>
          <button onClick={() => { const d: Record<string, SyncDecision> = {}; for (const c of changes) d[c.fieldName] = "use"; setDecisions(d); }}
            className="text-[10px] text-white/50 hover:text-white">Use all</button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_80px] gap-2 px-2">
        <span className="text-[9px] text-white/30 uppercase tracking-wider">Current</span>
        <span className="text-[9px] text-white/30 uppercase tracking-wider">Store update</span>
        <span className="text-[9px] text-white/30 uppercase tracking-wider text-right">Action</span>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {changes.map(c => {
          const dec = decisions[c.fieldName] ?? (c.hasOverride ? "keep" : "use");
          return (
            <div key={c.fieldName} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
              <div className="flex items-center gap-1.5 px-2 py-1" style={{ background: "rgba(255,255,255,0.04)" }}>
                <span className="text-[10px] font-bold text-white/70">{formatFieldName(c.fieldName)}</span>
                {c.hasOverride && (
                  <span className="text-[9px] text-yellow-400 ml-1">manual override</span>
                )}
              </div>
              <div className="grid grid-cols-2 divide-x divide-white/10">
                <div className="p-2" style={{ background: dec === "keep" ? "rgba(193,255,0,0.06)" : "transparent" }}>
                  <div className="text-[9px] text-white/30 mb-0.5 uppercase tracking-wider">Current</div>
                  <div className="text-[11px] text-white/55 break-words line-clamp-2">{formatValue(c.currentValue) || <span className="italic text-white/25">empty</span>}</div>
                </div>
                <div className="p-2" style={{ background: dec === "use" ? "rgba(193,255,0,0.06)" : "transparent" }}>
                  <div className="text-[9px] text-white/30 mb-0.5 uppercase tracking-wider">Store</div>
                  <div className="text-[11px] text-white/80 break-words line-clamp-2">{formatValue(c.newValue)}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 p-1.5 border-t border-white/5">
                {(["keep", "use", "defer"] as const).map(d => {
                  const labels: Record<SyncDecision, string> = { keep: "Keep current", use: "Use store", defer: "Review later" };
                  const active = dec === d;
                  return (
                    <button key={d} onClick={() => setDecision(c.fieldName, d)}
                      className="flex-1 py-1 rounded text-[10px] font-bold transition-all"
                      style={{
                        background: active ? (d === "use" ? `${NEON}22` : d === "keep" ? "rgba(255,255,255,0.08)" : "rgba(99,102,241,0.15)") : "transparent",
                        color: active ? (d === "use" ? NEON : d === "keep" ? "white" : "#818cf8") : "rgba(255,255,255,0.3)",
                        border: `1px solid ${active ? (d === "use" ? `${NEON}66` : d === "keep" ? "rgba(255,255,255,0.2)" : "#6366f166") : "transparent"}`,
                      }}>
                      {labels[d]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold"
          style={{ background: NEON, color: "#070b10" }}>
          {applyMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Apply decisions{useCount > 0 ? ` (${useCount} store)` : ""}
        </button>
        <button onClick={() => { setChecked(false); setChanges([]); setDecisions({}); }}
          className="px-4 py-2 rounded text-xs font-bold text-white/60 border border-white/15 hover:text-white">Cancel</button>
      </div>
    </div>
  );
}
