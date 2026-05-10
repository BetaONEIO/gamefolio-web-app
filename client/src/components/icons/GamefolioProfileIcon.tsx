import { cn } from "@/lib/utils";

interface GamefolioProfileIconProps {
  className?: string;
}

export function GamefolioProfileIcon({ className }: GamefolioProfileIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-6 h-6", className)}
      aria-hidden="true"
    >
      {/* Left vertical bar */}
      <rect x="4" y="4" width="3" height="16" />
      {/* Top horizontal bar */}
      <rect x="4" y="4" width="16" height="3" />
      {/* Bottom horizontal bar */}
      <rect x="4" y="17" width="16" height="3" />
      {/* Right lower bar — only the bottom half (the closed side of the G) */}
      <rect x="17" y="11" width="3" height="9" />
      {/* G middle horizontal bar */}
      <rect x="11" y="11" width="9" height="3" />
    </svg>
  );
}
