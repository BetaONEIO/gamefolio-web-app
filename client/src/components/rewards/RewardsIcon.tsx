import { Gift } from "lucide-react";

interface RewardsIconProps {
  isClaimable?: boolean;
  size?: number;
  onClick?: () => void;
  className?: string;
}

// Mirrors LootboxIcon's claimable-state visual language (green #B7FF1A pulse +
// dot + sparkles) so the header has consistent "claim available" affordances.
export function RewardsIcon({
  isClaimable = false,
  size = 22,
  onClick,
  className = "",
}: RewardsIconProps) {
  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center justify-center rounded-lg transition-all duration-150 active:scale-90 ${className}`}
      style={{
        background: "transparent",
        border: "none",
        cursor: onClick ? "pointer" : "default",
        padding: 6,
        WebkitTapHighlightColor: "transparent",
      }}
      title={isClaimable ? "Daily / weekly reward available!" : "Rewards"}
      aria-label={isClaimable ? "Rewards — claim available" : "Rewards"}
      data-testid="button-rewards-icon"
    >
      {isClaimable && !prefersReduced && (
        <span
          className="absolute inset-0 rounded-lg"
          style={{
            background: "rgba(183,255,26,0.12)",
            animation: "lootbox-pulse 2.4s ease-in-out infinite",
          }}
        />
      )}

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
        <Gift size={size} strokeWidth={1.8} />
      </span>

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
    </button>
  );
}

export default RewardsIcon;
