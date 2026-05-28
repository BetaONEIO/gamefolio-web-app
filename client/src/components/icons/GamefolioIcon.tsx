import { cn } from "@/lib/utils";
import logoGreen from "@assets/gamefolio-logo-green.png";
import logoWhite from "@assets/gamefolio-logo-white.png";

interface GamefolioIconProps {
  glow?: boolean;
  className?: string;
}

export function GamefolioIcon({ glow = false, className }: GamefolioIconProps) {
  return (
    <img
      src={glow ? logoGreen : logoWhite}
      alt="Gamefolio"
      draggable={false}
      className={cn("block object-contain flex-shrink-0", className)}
      style={{
        filter: glow ? "drop-shadow(0 0 6px rgba(183,255,26,0.5))" : undefined,
      }}
    />
  );
}
