import { cn } from "@/lib/utils";
import logoGreen from "@assets/gamefolio-logo-green.png";
import logoWhite from "@assets/gamefolio-logo-white.png";

interface GamefolioIconProps {
  glow?: boolean;
  className?: string;
}

export function GamefolioIcon({ glow = false, className }: GamefolioIconProps) {
  return (
    <span className={cn("relative block flex-shrink-0", className)}>
      <img
        src={logoWhite}
        alt="Gamefolio"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className="block object-contain w-full h-full transition-opacity duration-300"
        style={{ opacity: glow ? 0 : 1, WebkitTouchCallout: "none", WebkitUserDrag: "none" } as React.CSSProperties}
      />
      <img
        src={logoGreen}
        alt=""
        draggable={false}
        aria-hidden
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 block object-contain w-full h-full transition-opacity duration-300"
        style={{
          opacity: glow ? 1 : 0,
          filter: glow ? "drop-shadow(0 0 6px rgba(183,255,26,0.5))" : undefined,
          WebkitTouchCallout: "none",
          WebkitUserDrag: "none",
        } as React.CSSProperties}
      />
    </span>
  );
}
