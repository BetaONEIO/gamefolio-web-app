import { ClipWithUser } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Gamepad2 } from "lucide-react";

interface GameOption {
  id: number;
  name: string;
  imageUrl: string | null;
}

interface GameFilterProps {
  clips: ClipWithUser[];
  selectedGameId: number | null;
  onGameSelect: (gameId: number | null) => void;
}

export function GameFilter({ clips, selectedGameId, onGameSelect }: GameFilterProps) {
  const uniqueGames = clips.reduce<GameOption[]>((acc, clip) => {
    if (clip.game && clip.game.id) {
      const existingGame = acc.find((g) => g.id === clip.game!.id);
      if (!existingGame) {
        acc.push({
          id: clip.game.id,
          name: clip.game.name,
          imageUrl: clip.game.imageUrl || null,
        });
      }
    }
    return acc;
  }, []);

  const sortedGames = uniqueGames.sort((a, b) => a.name.localeCompare(b.name));

  if (sortedGames.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Gamepad2 className="h-5 w-5 text-muted-foreground" />
      <Select
        value={selectedGameId?.toString() || "all"}
        onValueChange={(value) => {
          if (value === "all") {
            onGameSelect(null);
          } else {
            onGameSelect(parseInt(value));
          }
        }}
      >
        <SelectTrigger className="w-[200px]" data-testid="select-game-filter">
          <SelectValue placeholder="All Games" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" data-testid="option-all-games">
            All Games ({clips.length})
          </SelectItem>
          {sortedGames.map((game) => {
            const gameClipsCount = clips.filter(
              (clip) => clip.game?.id === game.id
            ).length;
            return (
              <SelectItem
                key={game.id}
                value={game.id.toString()}
                data-testid={`option-game-${game.id}`}
              >
                <div className="flex items-center gap-2">
                  {game.imageUrl && (
                    <img
                      src={game.imageUrl}
                      alt={game.name}
                      className="w-5 h-5 rounded object-cover"
                    />
                  )}
                  <span>
                    {game.name} ({gameClipsCount})
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
