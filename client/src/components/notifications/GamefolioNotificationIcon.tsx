import { cn } from "@/lib/utils";

interface GamefolioNotificationIconProps {
  className?: string;
  hasUnread?: boolean;
  isOpen?: boolean;
}

export function GamefolioNotificationIcon({
  className,
  hasUnread = false,
  isOpen = false,
}: GamefolioNotificationIconProps) {
  const isActive = hasUnread || isOpen;
  const color = isActive ? "#B7FF18" : "#9CA3AF";
  const glow = isActive
    ? "drop-shadow(0 0 5px rgba(183,255,26,0.55))"
    : "none";

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Bold, chunky, filled bell body — unmistakable, thick 3px stroke */}
        <path
          d="M4 16 L4 8 C4 4 7 2 12 2 C17 2 20 4 20 8 L20 16 L22 19 L2 19 L4 16 Z"
          stroke={color}
          strokeWidth="3"
          strokeLinejoin="round"
          fill={isActive ? "rgba(183,255,26,0.12)" : "none"}
          className="transition-all duration-300"
          style={{ filter: glow }}
        />

        {/* Thick bottom bar */}
        <path
          d="M2 19 L22 19"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          className="transition-all duration-300"
          style={{ filter: glow }}
        />

        {/* Clapper — chunky, rounded */}
        <path
          d="M10 19 L10 22 C10 23.5 11 25 12 25 C13 25 14 23.5 14 22 L14 19"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="transition-all duration-300"
          style={{ filter: glow }}
        />

        {/* Unread dot — top-right, neon green */}
        {hasUnread && (
          <>
            <circle
              cx="19.5"
              cy="5"
              r="3.5"
              fill="#B7FF18"
              style={{ filter: "drop-shadow(0 0 6px rgba(183,255,26,0.8))" }}
            />
            <circle
              cx="19.5"
              cy="5"
              r="3.5"
              fill="none"
              stroke="#B7FF18"
              strokeWidth="1"
              opacity="0.5"
              style={{
                animation: "notifPing 2s cubic-bezier(0, 0, 0.2, 1) infinite",
                transformOrigin: "center",
              }}
            />
          </>
        )}

        {/* Soft breathing ring when unread */}
        {hasUnread && (
          <circle
            cx="12"
            cy="12"
            r="11"
            fill="none"
            stroke="#B7FF18"
            strokeWidth="0.5"
            opacity="0.12"
            style={{ animation: "notifPulseRing 2.5s ease-in-out infinite" }}
          />
        )}
      </svg>
    </span>
  );
}
