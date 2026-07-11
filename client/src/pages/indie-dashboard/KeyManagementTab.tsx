import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, KeyRound, Plus } from "lucide-react";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";

interface IndieBounty {
  id: number;
  title: string;
  gameName: string | null;
  demoKeysRemaining: number;
  fullKeysRemaining: number;
}

interface KeyStatus {
  demoKeysRemaining: number;
  fullKeysRemaining: number;
  demoKeysDistributed: number;
  fullKeysDistributed: number;
}

const inputStyle = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff", borderRadius: "10px", padding: "10px 14px", width: "100%",
  outline: "none", fontSize: "14px", minHeight: "90px", resize: "vertical" as const,
};

function KeyPoolCard({ bounty }: { bounty: IndieBounty }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [demoKeys, setDemoKeys] = useState("");
  const [fullKeys, setFullKeys] = useState("");

  const { data: status } = useQuery<KeyStatus>({
    queryKey: ["/api/games/bounties", bounty.id, "keys"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/games/bounties/${bounty.id}/keys`);
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const demo = demoKeys.split(/\n|,/).map((k) => k.trim()).filter(Boolean);
      const full = fullKeys.split(/\n|,/).map((k) => k.trim()).filter(Boolean);
      const res = await apiRequest("POST", `/api/games/bounties/${bounty.id}/keys`, { demoKeys: demo, fullKeys: full });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Added ${data.demoKeysAdded} demo & ${data.fullKeysAdded} full keys`, variant: "gamefolioSuccess" as any });
      setDemoKeys("");
      setFullKeys("");
      queryClient.invalidateQueries({ queryKey: ["/api/games/bounties", bounty.id, "keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games/indie/bounties"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to add keys", variant: "gamefolioError" as any }),
  });

  return (
    <div className="rounded-2xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-bold text-white">{bounty.title}</div>
          <div className="text-xs text-gray-500">{bounty.gameName ?? "Unknown game"}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="text-lg font-black text-white">{status?.demoKeysRemaining ?? bounty.demoKeysRemaining}</div>
          <div className="text-[10px] text-gray-500 uppercase">Demo Keys Left</div>
          <div className="text-[10px] text-gray-600">{status?.demoKeysDistributed ?? 0} distributed</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="text-lg font-black text-white">{status?.fullKeysRemaining ?? bounty.fullKeysRemaining}</div>
          <div className="text-[10px] text-gray-500 uppercase">Full Keys Left</div>
          <div className="text-[10px] text-gray-600">{status?.fullKeysDistributed ?? 0} distributed</div>
        </div>
      </div>

      <div className="space-y-2">
        <textarea style={inputStyle} placeholder="Add demo keys (one per line)" value={demoKeys} onChange={(e) => setDemoKeys(e.target.value)} />
        <textarea style={inputStyle} placeholder="Add full keys (one per line)" value={fullKeys} onChange={(e) => setFullKeys(e.target.value)} />
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || (!demoKeys.trim() && !fullKeys.trim())}
          className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl"
          style={{ background: NEON, color: "#0a0f1c" }}
        >
          {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add Keys
        </button>
      </div>
    </div>
  );
}

export default function KeyManagementTab() {
  const { data: bounties = [], isLoading } = useQuery<IndieBounty[]>({ queryKey: ["/api/games/indie/bounties"] });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} /></div>;
  }

  if (bounties.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <KeyRound className="w-8 h-8 mx-auto mb-3 text-gray-600" />
        <p className="text-sm text-gray-500">Create a bounty to manage its game keys.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {bounties.map((b) => <KeyPoolCard key={b.id} bounty={b} />)}
    </div>
  );
}
