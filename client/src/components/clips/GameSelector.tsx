import { useState } from "react";
import { ChevronsUpDown, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Game } from "@shared/schema";
import { GamePickerSheet } from "@/components/clips/GamePickerSheet";

interface GameSelectorProps {
  games: Game[];
  selectedGame: Game | null;
  onSelect: (game: Game | null) => void;
}

const GameSelector = ({ selectedGame, onSelect }: GameSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between h-12 sm:h-10 text-base sm:text-sm"
        data-testid="button-select-game"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center gap-3 sm:gap-2 overflow-hidden">
          {selectedGame ? (
            <>
              {selectedGame.imageUrl ? (
                <div className="h-7 w-7 sm:h-6 sm:w-6 shrink-0 overflow-hidden rounded">
                  <img
                    src={selectedGame.imageUrl}
                    alt={selectedGame.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/favicon.png";
                    }}
                  />
                </div>
              ) : (
                <div className="h-7 w-7 sm:h-6 sm:w-6 shrink-0 overflow-hidden rounded bg-secondary flex items-center justify-center">
                  <Gamepad2 className="h-4 w-4 sm:h-3 sm:w-3 text-muted-foreground" />
                </div>
              )}
              <span className="truncate font-medium">{selectedGame.name}</span>
            </>
          ) : (
            <span className="truncate text-muted-foreground">Select a game...</span>
          )}
        </div>
        <ChevronsUpDown className="ml-2 h-5 w-5 sm:h-4 sm:w-4 shrink-0 opacity-50" />
      </Button>

      <GamePickerSheet
        open={open}
        onClose={() => setOpen(false)}
        selectedGame={selectedGame}
        onSelect={onSelect}
        title="Select a Game"
      />
    </>
  );
};

export default GameSelector;
