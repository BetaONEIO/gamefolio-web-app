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

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
    >
      {/* Outer ring pulse when unread */}
      {hasUnread && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            animation: "notifPulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            background:
              "radial-gradient(circle, rgba(183,255,26,0.35) 0%, transparent 70%)",
          }}
        />
      )}

      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "w-full h-full transition-all duration-300",
          isActive
            ? "text-[#B7FF18]"
            : "text-gray-400 hover:text-[#B7FF18]"
        )}
      >
        {/* Base platform - angular */}
        <path
          d="M4 19L6 17H18L20 19"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 17V15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M18 17V15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Main beacon tower - angular silhouette */}
        <path
          d="M9 15L10 8H14L15 15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Signal waves - top arc */}
        <path
          d="M7.5 4C7.5 4 9 2 12 2C15 2 16.5 4 16.5 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity={isActive ? 1 : 0.7}
          className="transition-opacity duration-300"
        />
        <path
          d="M9.5 5.5C9.5 5.5 10.5 4 12 4C13.5 4 14.5 5.5 14.5 5.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity={isActive ? 1 : 0.5}
          className="transition-opacity duration-300"
        />

        {/* Top beacon dot */}
        <circle
          cx="12"
          cy="5.5"
          r="1.5"
          fill="currentColor"
          className="transition-opacity duration-300"
          opacity={isActive ? 1 : 0.8}
        />

        {/* Glow glow effect on active */}
        {isActive && (
          <>
            <circle
              cx="12"
              cy="5.5"
              r="3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              opacity={0.4}
              style={{
                animation: "notifPing 2s cubic-bezier(0, 0, 0.2, 1) infinite",
                transformOrigin: "center",
              }}
            />
            <path
              d="M7.5 4C7.5 4 9 2 12 2C15 2 16.5 4 16.5 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
              opacity={0.6}
              style={{
                animation: "notifPing 2s cubic-bezier(0, 0, 0.2, 1) infinite",
                animationDelay: "0.3s",
                transformOrigin: "center",
              }}
            />
          </>
        )}
      </svg>
    </span>
  );
}
