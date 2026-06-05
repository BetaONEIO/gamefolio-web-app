import { cn } from "@/lib/utils";
import logoSrc from "@assets/gamefolio-logo-green.png";

interface GamefolioProfileIconProps {
  className?: string;
}

export function GamefolioProfileIcon({ className }: GamefolioProfileIconProps) {
  return (
    <img
      src={logoSrc}
      alt="Gamefolio"
      draggable={false}
      className={cn("block object-contain flex-shrink-0", className)}
    />
  );
}
