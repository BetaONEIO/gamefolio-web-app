import type { ReactNode } from "react";

interface LootboxIconProps {
  isClaimable?: boolean;
  size?: number;
  onClick?: () => void;
  className?: string;
}

function CrateSVG({ color, size }: { color: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Lid */}
      <path d="M4 10h16v3H4z" />
      {/* Rounded top of lid */}
      <path d="M5 10V9a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1" />
      {/* Body */}
      <path d="M4 13h16v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7z" />
      {/* Vertical center strap on body */}
      <line x1="12" y1="13" x2="12" y2="21" />
      {/* Horizontal center strap on body */}
      <line x1="4" y1="17" x2="20" y2="17" />
      {/* Clasp on lid — small diamond */}
      <path d="M10.5 11.5h3l-1.5 1.5-1.5-1.5z" />
      {/* Clasp top half */}
      <path d="M10.5 10.5h3l-1.5-1 -1.5 1z" strokeWidth="1" />
      {/* Lock pin */}
      <line x1="12" y1="9.5" x2="12" y2="10.5" strokeWidth="1.4" />
    </svg>
  );
}

export function LootboxIcon({
  isClaimable = false,
  size = 22,
  onClick,
  className = "",
}: LootboxIconProps) {
  const iconColor = isClaimable ? "#B7FF1A" : "currentColor";

  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center rounded-lg transition-all duration-150 active:scale-90 ${className}`}
      style={{
        background: "transparent",
        border: "none",
        cursor: onClick ? "pointer" : "default",
        padding: 6,
        WebkitTapHighlightColor: "transparent",
      }}
      title={isClaimable ? "Lootbox available!" : "Daily Lootbox"}
      aria-label={isClaimable ? "Daily lootbox — claim available" : "Daily lootbox"}
    >
      {/* Outer glow ring when claimable */}
      {isClaimable && !prefersReduced && (
        <span
          className="absolute inset-0 rounded-lg"
          style={{
            background: "rgba(183,255,26,0.12)",
            animation: "lootbox-pulse 2.4s ease-in-out infinite",
          }}
        />
      )}

      {/* Icon wrapper with float + glow */}
      <span
        className="relative flex items-center justify-center"
        style={
          isClaimable && !prefersReduced
            ? {
                animation: "lootbox-float 2.8s ease-in-out infinite",
                filter: "drop-shadow(0 0 6px rgba(183,255,26,0.7))",
                color: "#B7FF1A",
              }
            : { color: "currentColor" }
        }
      >
        <CrateSVG color={iconColor} size={size} />
      </span>

      {/* Notification dot when claimable */}
      {isClaimable && (
        <span
          className="absolute -top-0.5 -right-0.5 flex items-center justify-center"
          style={{ width: 9, height: 9 }}
        >
          <span
            className="absolute inline-flex rounded-full"
            style={{
              width: "100%",
              height: "100%",
              background: "#B7FF1A",
              opacity: 0.6,
              animation: prefersReduced ? "none" : "lootbox-ping 1.8s cubic-bezier(0,0,0.2,1) infinite",
            }}
          />
          <span
            className="relative inline-flex rounded-full"
            style={{ width: 7, height: 7, background: "#B7FF1A" }}
          />
        </span>
      )}

      {/* Sparkle particles when claimable */}
      {isClaimable && !prefersReduced && (
        <>
          <span
            className="absolute"
            style={{
              top: 1,
              right: 4,
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "#B7FF1A",
              opacity: 0,
              animation: "lootbox-sparkle 2.4s ease-in-out 0.3s infinite",
            }}
          />
          <span
            className="absolute"
            style={{
              bottom: 3,
              left: 3,
              width: 2,
              height: 2,
              borderRadius: "50%",
              background: "#B7FF1A",
              opacity: 0,
              animation: "lootbox-sparkle 2.4s ease-in-out 1.1s infinite",
            }}
          />
          <span
            className="absolute"
            style={{
              top: 5,
              left: 2,
              width: 2,
              height: 2,
              borderRadius: "50%",
              background: "#B7FF1A",
              opacity: 0,
              animation: "lootbox-sparkle 2.4s ease-in-out 1.8s infinite",
            }}
          />
        </>
      )}
    </button>
  );
}

export default LootboxIcon;
