import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Camera, ChevronLeft, Film, Gamepad2, Loader2, Video } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DASHBOARD_THEME, NEON } from "@/pages/indie-dashboard/constants";
import { resolveApiUrl } from "@/lib/platform";
import { useAuth } from "@/hooks/use-auth";

type OwnedGame = {
  id: number;
  name: string;
  imageUrl?: string | null;
};

type GameProfileListResponse = {
  games?: Array<{
    catalogGameId?: number | null;
    gameName?: string | null;
    headerImageUrl?: string | null;
    capsuleImageUrl?: string | null;
  }>;
};

type ContentChoice = {
  type: "clips" | "reels" | "screenshots";
  label: string;
  description: string;
  icon: typeof Film;
};

const CONTENT_CHOICES: ContentChoice[] = [
  { type: "clips", label: "Clip", description: "Share a short gameplay moment", icon: Film },
  { type: "reels", label: "Reel", description: "Publish a vertical gameplay highlight", icon: Video },
  { type: "screenshots", label: "Screenshot", description: "Show off a moment from your game", icon: Camera },
];

export default function DeveloperUploadContentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [, setLocation] = useLocation();
  const [selectedGame, setSelectedGame] = useState<OwnedGame | null>(null);
  const { user } = useAuth();
  const username = user?.username;
  const { data, isLoading, isError } = useQuery<GameProfileListResponse>({
    queryKey: ["/api/games/indie", username, "uploadable-games"],
    queryFn: async () => {
      const response = await fetch(resolveApiUrl(`/api/games/indie/${encodeURIComponent(username!)}/list`), { credentials: "include" });
      if (response.status === 404) return { games: [] };
      if (!response.ok) throw new Error("Could not load your games");
      return response.json();
    },
    enabled: open && !!username,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!open) setSelectedGame(null);
  }, [open]);

  const ownedGames: OwnedGame[] = (data?.games ?? [])
    .filter((game) => Number.isInteger(game.catalogGameId) && Number(game.catalogGameId) > 0)
    .map((game) => ({
      id: Number(game.catalogGameId),
      name: game.gameName?.trim() || `Game ${game.catalogGameId}`,
      imageUrl: game.capsuleImageUrl ?? game.headerImageUrl ?? null,
    }));

  const beginUpload = (type: ContentChoice["type"]) => {
    if (!selectedGame) return;
    const params = new URLSearchParams({
      type,
      gameId: String(selectedGame.id),
      gameName: selectedGame.name,
    });
    if (selectedGame.imageUrl) params.set("gameImage", selectedGame.imageUrl);
    onOpenChange(false);
    setLocation(`/upload?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md overflow-hidden p-0"
        style={{
          background: DASHBOARD_THEME.page,
          border: `1px solid ${DASHBOARD_THEME.borderSubtle}`,
          color: DASHBOARD_THEME.text,
        }}
        data-testid="dialog-developer-upload-content"
      >
        <DialogHeader className="border-b px-5 py-5" style={{ borderColor: DASHBOARD_THEME.borderSubtle }}>
          <div className="flex items-center gap-3">
            {selectedGame && (
              <button
                type="button"
                onClick={() => setSelectedGame(null)}
                className="rounded-lg p-1.5 text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
                aria-label="Back to your games"
                data-testid="button-upload-content-back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <DialogTitle className="text-base font-black text-white">
                {selectedGame ? `Upload to ${selectedGame.name}` : "Upload Content"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-white/40">
                {selectedGame ? "Choose what you would like to upload." : "Choose one of your games to get started."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 p-5">
          {selectedGame ? (
            CONTENT_CHOICES.map(({ type, label, description, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => beginUpload(type)}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:brightness-110"
                style={{
                  background: "rgba(255,255,255,0.035)",
                  border: `1px solid ${DASHBOARD_THEME.borderSubtle}`,
                }}
                data-testid={`button-upload-content-${type}`}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "rgba(183,255,24,0.10)", color: NEON }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-white">{label}</span>
                  <span className="mt-0.5 block text-xs text-white/35">{description}</span>
                </span>
              </button>
            ))
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-white/40">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: NEON }} />
              Loading your games…
            </div>
          ) : isError ? (
            <div className="rounded-xl px-4 py-8 text-center text-xs text-white/45"
              style={{ background: "rgba(255,255,255,0.025)" }}>
              We couldn’t load your games. Please close this and try again.
            </div>
          ) : ownedGames.length === 0 ? (
            <div className="rounded-xl px-4 py-8 text-center"
              style={{ background: "rgba(255,255,255,0.025)", border: `1px dashed ${DASHBOARD_THEME.borderSubtle}` }}>
              <Gamepad2 className="mx-auto mb-2 h-7 w-7 text-white/20" />
              <p className="text-sm font-bold text-white/65">No games connected yet</p>
              <p className="mt-1 text-xs text-white/35">Add your game in the Game Dashboard before uploading content.</p>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  setLocation("/game-dashboard?tab=game-profile");
                }}
                className="mt-4 rounded-lg px-3 py-2 text-xs font-bold"
                style={{ background: "rgba(183,255,24,0.10)", color: NEON }}
                data-testid="button-upload-content-go-to-profile"
              >
                Go to Game Profile
              </button>
            </div>
          ) : (
            ownedGames.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => setSelectedGame(game)}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:brightness-110"
                style={{
                  background: "rgba(255,255,255,0.035)",
                  border: `1px solid ${DASHBOARD_THEME.borderSubtle}`,
                }}
                data-testid={`button-upload-game-${game.id}`}
              >
                {game.imageUrl ? (
                  <img src={game.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "rgba(183,255,24,0.10)", color: NEON }}>
                    <Gamepad2 className="h-5 w-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">{game.name}</span>
                  <span className="mt-0.5 block text-xs text-white/35">Upload content for this game</span>
                </span>
                <ChevronLeft className="h-4 w-4 rotate-180 text-white/25" />
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}