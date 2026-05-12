import { cn } from "@/lib/utils";
import logoSrc from "@assets/White_logo_1778586086030.png";

interface GamefolioIconProps {
  size?: number;
  glow?: boolean;
  className?: string;
}

export function GamefolioIcon({ size = 24, glow = false, className }: GamefolioIconProps) {
  return (
    <img
      src={logoSrc}
      alt="Gamefolio"
      draggable={false}
      className={cn("flex-shrink-0", className)}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "inline-block",
        filter: glow ? "drop-shadow(0 0 6px rgba(183,255,26,0.5))" : undefined,
      }}
    />
  );
}
