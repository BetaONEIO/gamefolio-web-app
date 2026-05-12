import { cn } from "@/lib/utils";
import logoSrc from "@assets/logo-white_1778587630337.png";

interface GamefolioIconProps {
  glow?: boolean;
  className?: string;
}

export function GamefolioIcon({ glow = false, className }: GamefolioIconProps) {
  return (
    <img
      src={logoSrc}
      alt="Gamefolio"
      draggable={false}
      className={cn("block w-6 h-6 object-contain flex-shrink-0", className)}
      style={glow ? { filter: "drop-shadow(0 0 6px rgba(183,255,26,0.5))" } : undefined}
    />
  );
}
