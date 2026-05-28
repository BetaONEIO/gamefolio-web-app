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
  const glow = isActive ? "drop-shadow(0 0 5px rgba(183,255,26,0.55))" : "none";

  return (
    <span className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Bold outer circle — thick 3px stroke, strong silhouette */}
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke={color}
          strokeWidth="3"
          fill="none"
          className="transition-all duration-300"
          style={{ filter: glow }}
        />

        {/* Bold inner ring — slightly offset at 12 o'clock gap */}
        <path
          d="M12 6 A6 6 0 1 1 11.9 6"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-300"
          style={{ filter: glow }}
        />

        {/* Solid centre dot — bold, prominent */}
        <circle
          cx="12"
          cy="12"
          r="3"
          fill={color}
          className="transition-all duration-300"
          style={{ filter: glow }}
        />

        {/* Unread dot — top-right, neon green */}
        {hasUnread && (
          <>
            <circle
              cx="19"
              cy="5"
              r="3.5"
              fill="#B7FF18"
              style={{ filter: "drop-shadow(0 0 6px rgba(183,255,26,0.8))" }}
            />
            <circle
              cx="19"
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

        {/* Soft outer breathing ring when unread */}
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
