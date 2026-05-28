import { cn } from "@/lib/utils";
import logoSrc from "@assets/gamefolio-logo-white.png";

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
      className={cn("block object-contain flex-shrink-0", className)}
      style={{
        transform: "translateY(-2px)",
        filter: glow ? "drop-shadow(0 0 6px rgba(183,255,26,0.5))" : undefined,
      }}
    />
  );
}
