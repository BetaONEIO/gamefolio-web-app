import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Crown, Flame, Gamepad2, Coins, Sparkles, ExternalLink, ChevronRight, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

const NEON = "#B7FF18";
const BG = "#0B1319";
const CARD = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

const cardStyle = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: "14px" };

const CATEGORY_LABELS: Record<string, string> = {
  overall: "Overall",
  action: "Action",
  adventure: "Adventure",
  rpg: "RPG",
  strategy: "Strategy",
  simulation: "Simulation",
  puzzle: "Puzzle",
  horror: "Horror",
  platformer: "Platformer",
  multiplayer: "Multiplayer",
  sports: "Sports",
  other: "Other",
};

interface LeaderRow {
  id: number;
  gameId: number;
  userId: number;
  category: string;
  gftAmount: number;
  createdAt: string;
  gameName: string | null;
  studioName: string | null;
  capsuleImageUrl: string | null;
  headerImageUrl: string | null;
  shortDescription: string | null;
  steamUrl: string | null;
  itchUrl: string | null;
  username: string;
}

interface RecentRow {
  id: number;
  category: string;
  gftAmount: number;
  createdAt: string;
  isActive: boolean;
  gameName: string | null;
  username: string;
}

interface LeaderboardResponse {
  categories: string[];
  leaders: LeaderRow[];
  recent: RecentRow[];
}

interface MyGame {
  id: number;
  gameName: string | null;
  capsuleImageUrl: string | null;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SpotlightLeaderboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [claimTarget, setClaimTarget] = useState<{ category: string; minRequired: number } | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [bidAmount, setBidAmount] = useState<string>("");

  const { data, isLoading } = useQuery<LeaderboardResponse>({
    queryKey: ["/api/spotlight-leaderboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/spotlight-leaderboard");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { data: myGames } = useQuery<{ games: MyGame[] }>({
    queryKey: ["/api/indie/games"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/indie/games");
      return res.json();
    },
    enabled: !!user,
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/spotlight-leaderboard/claim", {
        gameId: Number(selectedGameId),
        category: claimTarget?.category ?? "overall",
        gftAmount: Number(bidAmount),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "You're #1", description: "Your game is now on top of the spotlight leaderboard." });
      queryClient.invalidateQueries({ queryKey: ["/api/spotlight-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setClaimTarget(null);
      setBidAmount("");
    },
    onError: (err: any) => {
      let message = err?.message ?? "Something went wrong.";
      const jsonStart = message.indexOf("{");
      if (jsonStart >= 0) {
        try {
          const parsed = JSON.parse(message.slice(jsonStart));
          message = parsed.error ?? message;
        } catch { /* fall through with raw message */ }
      }
      toast({ title: "Couldn't claim that spot", description: message, variant: "destructive" });
    },
  });

  const categories = data?.categories ?? Object.keys(CATEGORY_LABELS);
  const leaders = data?.leaders ?? [];
  const overallLeader = leaders.find((l) => l.category === "overall");
  const otherLeaders = leaders.filter((l) => l.category !== "overall").sort((a, b) => b.gftAmount - a.gftAmount);

  const games = myGames?.games ?? [];

  const openClaim = (category: string, currentAmount?: number) => {
    const min = (currentAmount ?? 0) + 1;
    setClaimTarget({ category, minRequired: min });
    setBidAmount(String(min));
    setSelectedGameId(games[0]?.id ? String(games[0].id) : "");
  };

  return (
    <div className="min-h-screen" style={{ background: BG, color: "white" }}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: "rgba(183,255,24,0.1)", border: `1px solid rgba(183,255,24,0.25)`, color: NEON }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Spotlight Leaderboard
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Pay GFT. Take the #1 spot.
          </h1>
          <p className="text-sm text-white/60 max-w-xl mx-auto">
            Indie devs spend GFT to hold the top slot for their game, per category. Get outbid and
            someone else takes your place — bids aren't refunded, so the ladder only goes up.
          </p>
        </div>

        {/* Overall #1 - hero card */}
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : overallLeader ? (
          <div
            className="relative overflow-hidden rounded-2xl p-6 flex flex-col sm:flex-row gap-5 items-center"
            style={{
              background: "linear-gradient(135deg, rgba(183,255,24,0.12), rgba(183,255,24,0.02))",
              border: `1px solid rgba(183,255,24,0.3)`,
            }}
          >
            <Crown className="absolute top-4 right-4 w-6 h-6" style={{ color: NEON }} />
            {overallLeader.capsuleImageUrl ? (
              <img
                src={overallLeader.capsuleImageUrl}
                alt={overallLeader.gameName ?? "Game"}
                className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: CARD }}>
                <Gamepad2 className="w-10 h-10 text-white/30" />
              </div>
            )}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="text-xs uppercase tracking-wide" style={{ color: NEON }}>#1 Overall</div>
              <div className="text-xl font-bold truncate">{overallLeader.gameName ?? "Untitled game"}</div>
              <div className="text-sm text-white/50">
                {overallLeader.studioName ?? overallLeader.username} · claimed {timeAgo(overallLeader.createdAt)}
              </div>
              {overallLeader.shortDescription && (
                <p className="text-sm text-white/70 mt-1 line-clamp-2">{overallLeader.shortDescription}</p>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-2xl font-bold" style={{ color: NEON }}>
                <Coins className="w-5 h-5" />
                {overallLeader.gftAmount.toLocaleString()}
              </div>
              <Button
                size="sm"
                style={{ background: NEON, color: BG }}
                className="font-semibold hover:opacity-90"
                onClick={() => openClaim("overall", overallLeader.gftAmount)}
              >
                Outbid for {(overallLeader.gftAmount + 1).toLocaleString()} GFT
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-8 text-center" style={cardStyle}>
            <Trophy className="w-10 h-10 mx-auto mb-3 text-white/30" />
            <div className="font-semibold mb-1">No one's claimed #1 yet</div>
            <div className="text-sm text-white/50 mb-4">Be the first indie dev on the spotlight leaderboard.</div>
            <Button style={{ background: NEON, color: BG }} className="font-semibold hover:opacity-90" onClick={() => openClaim("overall", 0)}>
              Claim #1 Overall
            </Button>
          </div>
        )}

        {/* Category leaders */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Category leaders</h2>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : otherLeaders.length === 0 ? (
            <div className="text-sm text-white/40 py-4">No category claims yet — every category is up for grabs.</div>
          ) : (
            <div className="space-y-2">
              {otherLeaders.map((row) => (
                <div key={row.id} className="flex items-center gap-3 p-3 rounded-xl" style={cardStyle}>
                  {row.capsuleImageUrl ? (
                    <img src={row.capsuleImageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <Gamepad2 className="w-4 h-4 text-white/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] border-white/15 text-white/50">
                        {CATEGORY_LABELS[row.category] ?? row.category}
                      </Badge>
                      <span className="font-medium truncate">{row.gameName ?? "Untitled game"}</span>
                    </div>
                    <div className="text-xs text-white/40 truncate">{row.studioName ?? row.username}</div>
                  </div>
                  <div className="flex items-center gap-1 font-semibold flex-shrink-0" style={{ color: NEON }}>
                    <Coins className="w-3.5 h-3.5" />
                    {row.gftAmount.toLocaleString()}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/15 text-white hover:bg-white/10 flex-shrink-0"
                    onClick={() => openClaim(row.category, row.gftAmount)}
                  >
                    Outbid
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Empty categories still claimable */}
          <div className="flex flex-wrap gap-2 pt-1">
            {categories
              .filter((c) => c !== "overall" && !otherLeaders.some((l) => l.category === c))
              .map((c) => (
                <button
                  key={c}
                  onClick={() => openClaim(c, 0)}
                  className="text-xs px-2.5 py-1 rounded-full text-white/50 hover:text-white transition-colors"
                  style={{ border: `1px dashed ${BORDER}` }}
                >
                  + Claim {CATEGORY_LABELS[c] ?? c}
                </button>
              ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide flex items-center gap-1.5">
            <Flame className="w-4 h-4" /> Latest activity
          </h2>
          <div className="space-y-1.5">
            {(data?.recent ?? []).slice(0, 8).map((row) => (
              <div key={row.id} className="flex items-center justify-between text-sm py-1.5 border-b" style={{ borderColor: BORDER }}>
                <div className="min-w-0 truncate text-white/70">
                  <span className="font-medium text-white">{row.gameName ?? "Untitled game"}</span>
                  {" "}claimed{" "}
                  <span className="text-white/50">{CATEGORY_LABELS[row.category] ?? row.category}</span>
                  {!row.isActive && <span className="text-white/30"> (later outbid)</span>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span className="flex items-center gap-1" style={{ color: NEON }}>
                    <Coins className="w-3 h-3" />{row.gftAmount.toLocaleString()}
                  </span>
                  <span className="text-white/30 text-xs">{timeAgo(row.createdAt)}</span>
                </div>
              </div>
            ))}
            {(data?.recent ?? []).length === 0 && !isLoading && (
              <div className="text-sm text-white/40 py-2">No claims yet — this leaderboard is brand new.</div>
            )}
          </div>
        </div>

        {!user && (
          <div className="text-center text-sm text-white/50 pt-2">
            <Link href="/auth" className="underline hover:text-white">Sign in</Link> as an indie developer to claim a spot.
          </div>
        )}
      </div>

      {/* Claim dialog */}
      <Dialog open={!!claimTarget} onOpenChange={(open) => !open && setClaimTarget(null)}>
        <DialogContent style={{ background: "#0F1820", border: `1px solid ${BORDER}`, color: "white" }}>
          <DialogHeader>
            <DialogTitle>
              Claim #1 in {claimTarget ? (CATEGORY_LABELS[claimTarget.category] ?? claimTarget.category) : ""}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Spend GFT from your balance to take this spot. This is non-refundable — if someone
              outbids you later, you don't get the GFT back.
            </DialogDescription>
          </DialogHeader>

          {!user ? (
            <div className="text-sm text-white/60 py-2">Sign in first to claim a spotlight spot.</div>
          ) : games.length === 0 ? (
            <div className="text-sm text-white/60 py-2 space-y-2">
              <p>You need an indie game profile before you can claim a spot.</p>
              <Link href="/studio-dashboard" className="inline-flex items-center gap-1 underline" style={{ color: NEON }}>
                Set up your game <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs text-white/50">Which game?</label>
                <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Choose a game" />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.gameName ?? `Game #${g.id}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">
                  GFT bid (minimum {claimTarget?.minRequired.toLocaleString()})
                </label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    type="number"
                    min={claimTarget?.minRequired ?? 1}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="text-xs text-white/40">
                  Your balance: {(user.gfTokenBalance ?? 0).toLocaleString()} GFT
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" className="text-white/60 hover:text-white" onClick={() => setClaimTarget(null)}>
              Cancel
            </Button>
            {user && games.length > 0 && (
              <Button
                style={{ background: NEON, color: BG }}
                className="font-semibold hover:opacity-90"
                disabled={
                  claimMutation.isPending ||
                  !selectedGameId ||
                  Number(bidAmount) < (claimTarget?.minRequired ?? 1) ||
                  Number(bidAmount) > (user.gfTokenBalance ?? 0)
                }
                onClick={() => claimMutation.mutate()}
              >
                {claimMutation.isPending ? "Claiming…" : `Spend ${Number(bidAmount || 0).toLocaleString()} GFT`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
