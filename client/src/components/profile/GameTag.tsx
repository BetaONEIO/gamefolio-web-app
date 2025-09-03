import { Game } from "@shared/schema";
import { Link } from "wouter";

interface GameTagProps {
  game: Game;
}

const GameTag = ({ game }: GameTagProps) => {
  return (
    <Link href={`/explore?game=${game.id}`}>
      <a className="bg-background px-3 py-1 rounded-md text-foreground text-sm font-medium hover:bg-secondary border border-border transition-colors">
        {game.name}
      </a>
    </Link>
  );
};

export default GameTag;
