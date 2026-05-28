import { cn } from "@/lib/utils";

interface GamefolioNotificationIconProps {
  className?: string;
  hasUnread?: boolean;
  isOpen?: boolean;
}

/**
 * Gamefolio custom notification icon — signal beacon / radar pulse.
 * Three concentric arcs fan upward from a broadcast-tower base.
 * Reads clearly at 16px–96px; fully distinct from any icon library.
 *
 *   States
 *   ──────
 *   default  : grey arcs, no fill
 *   active   : neon #B7FF18 arcs + subtle fill + glow
 *   hasUnread: active + neon badge dot top-right + breathing ring
 */
export function GamefolioNotificationIcon({
  className,
  hasUnread = false,
  isOpen = false,
}: GamefolioNotificationIconProps) {
  const isActive = hasUnread || isOpen;
  const arcColor = isActive ? "#B7FF18" : "#6B7280";
  const dotColor = "#B7FF18";
  const glowFilter = isActive
    ? "drop-shadow(0 0 4px rgba(183,255,26,0.65))"
    : "none";

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center select-none",
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        {/* ── Signal arcs — all centered on the beacon base (12, 20) ── */}

        {/* Outer arc  r=8 */}
        <path
          d="M 4 20 A 8 8 0 0 0 20 20"
          stroke={arcColor}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-300"
          style={{ filter: glowFilter }}
        />

        {/* Middle arc  r=5 */}
        <path
          d="M 7 20 A 5 5 0 0 0 17 20"
          stroke={arcColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-300"
          style={{ filter: glowFilter }}
        />

        {/* Inner arc  r=2.5 */}
        <path
          d="M 9.5 20 A 2.5 2.5 0 0 0 14.5 20"
          stroke={arcColor}
          strokeWidth="3"
          strokeLinecap="round"
          fill={isActive ? "rgba(183,255,26,0.18)" : "none"}
          className="transition-all duration-300"
          style={{ filter: glowFilter }}
        />

        {/* ── Beacon base ── */}

        {/* Vertical stem */}
        <line
          x1="12" y1="20"
          x2="12" y2="23"
          stroke={arcColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          className="transition-all duration-300"
          style={{ filter: glowFilter }}
        />

        {/* Horizontal base bar */}
        <line
          x1="9.5" y1="23"
          x2="14.5" y2="23"
          stroke={arcColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          className="transition-all duration-300"
          style={{ filter: glowFilter }}
        />

        {/* Center beacon dot */}
        <circle
          cx="12"
          cy="20"
          r="1.5"
          fill={arcColor}
          className="transition-all duration-300"
          style={{ filter: glowFilter }}
        />

        {/* ── Unread badge — neon dot top-right with ping ring ── */}
        {hasUnread && (
          <>
            {/* Solid badge */}
            <circle
              cx="19.5"
              cy="4.5"
              r="3"
              fill={dotColor}
              style={{ filter: "drop-shadow(0 0 5px rgba(183,255,26,0.9))" }}
            />
            {/* Ping ring */}
            <circle
              cx="19.5"
              cy="4.5"
              r="3"
              fill="none"
              stroke={dotColor}
              strokeWidth="1.5"
              opacity="0.6"
              style={{
                animation: "notifPing 2s cubic-bezier(0,0,0.2,1) infinite",
                transformOrigin: "19.5px 4.5px",
              }}
            />
          </>
        )}

        {/* ── Breathing outer ring when unread ── */}
        {hasUnread && (
          <circle
            cx="12"
            cy="13"
            r="11.5"
            fill="none"
            stroke={dotColor}
            strokeWidth="0.75"
            opacity="0"
            style={{ animation: "notifPulseRing 2.5s ease-in-out infinite" }}
          />
        )}
      </svg>
    </span>
  );
}
