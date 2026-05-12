import { cn } from "@/lib/utils";

interface GamefolioIconProps {
  size?: number;
  glow?: boolean;
  className?: string;
}

export function GamefolioIcon({ size = 32, glow = false, className }: GamefolioIconProps) {
  const padding = Math.round(size * 0.18);
  const innerSize = size - padding * 2;

  return (
    <span
      className={cn("inline-flex items-center justify-center flex-shrink-0", className)}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: Math.round(size * 0.22),
        backgroundColor: "#0B1218",
        border: "1.5px solid #1B2A33",
        boxShadow: glow
          ? "0 0 0 1px rgba(183,255,26,0.25), 0 0 10px rgba(183,255,26,0.18)"
          : undefined,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="#B7FF1A"
        width={innerSize}
        height={innerSize}
        aria-hidden="true"
      >
        {/* Left vertical bar */}
        <rect x="4" y="4" width="3" height="16" />
        {/* Top horizontal bar */}
        <rect x="4" y="4" width="16" height="3" />
        {/* Bottom horizontal bar */}
        <rect x="4" y="17" width="16" height="3" />
        {/* Right lower bar */}
        <rect x="17" y="11" width="3" height="9" />
        {/* G middle horizontal bar */}
        <rect x="11" y="11" width="9" height="3" />
      </svg>
    </span>
  );
}
