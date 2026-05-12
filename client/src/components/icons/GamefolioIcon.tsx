import { cn } from "@/lib/utils";
import logoSrc from "@assets/White_logo_1778586086030.png";

interface GamefolioIconProps {
  size?: number;
  glow?: boolean;
  className?: string;
}

export function GamefolioIcon({ size = 32, glow = false, className }: GamefolioIconProps) {
  return (
    <span
      className={cn("inline-flex items-center justify-center flex-shrink-0 overflow-hidden", className)}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: Math.round(size * 0.22),
        backgroundColor: "#03080A",
        border: "1.5px solid #1B2A33",
        boxShadow: glow
          ? "0 0 0 1px rgba(183,255,26,0.28), 0 0 10px rgba(183,255,26,0.2)"
          : undefined,
      }}
    >
      <img
        src={logoSrc}
        alt="Gamefolio"
        draggable={false}
        style={{
          width: "90%",
          height: "90%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </span>
  );
}
