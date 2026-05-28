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
        {/* Bold squared bell body — thick 2.5px stroke, geometric */}
        <path
          d="M5 16 L5 10 C5 6.1 8.1 3 12 3 C15.9 3 19 6.1 19 10 L19 16"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="transition-all duration-300"
          style={{ filter: glow }}
        />

        {/* Flat bottom bar — squared, geometric */}
        <path
          d="M3 16 L21 16"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          className="transition-all duration-300"
          style={{ filter: glow }}
        />

        {/* Angular clapper / bottom block — small square-ish nub */}
        <path
          d="M10 16 L10 18 C10 19.1 10.9 20 12 20 C13.1 20 14 19.1 14 18 L14 16"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="transition-all duration-300"
          style={{ filter: glow }}
        />

        {/* Top handle — angular, squared */}
        <path
          d="M10 3 L10 1.5 C10 1.2 10.2 1 10.5 1 L13.5 1 C13.8 1 14 1.2 14 1.5 L14 3"
          stroke={color}
          strokeWidth="2.5"
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
