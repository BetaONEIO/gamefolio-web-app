import { cn } from "@/lib/utils";

interface GamefolioExploreIconProps {
  className?: string;
}

export function GamefolioExploreIcon({ className }: GamefolioExploreIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-6 h-6", className)}
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="12" cy="12" r="9" />
      {/* Inner ring */}
      <circle cx="12" cy="12" r="5" />
      {/* Sweep line toward top-right */}
      <line x1="12" y1="12" x2="17.5" y2="6.5" />
      {/* Ping dot */}
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
