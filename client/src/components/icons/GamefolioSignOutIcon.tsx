import { cn } from "@/lib/utils";

interface GamefolioSignOutIconProps {
  className?: string;
}

export function GamefolioSignOutIcon({ className }: GamefolioSignOutIconProps) {
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
      {/* Door frame (left side) */}
      <path d="M9 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4" />
      {/* Exit arrow pointing right */}
      <path d="M15 16l4-4-4-4" />
      {/* Arrow shaft */}
      <line x1="8" y1="12" x2="19" y2="12" />
      {/* Door handle dot */}
      <circle cx="5.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
