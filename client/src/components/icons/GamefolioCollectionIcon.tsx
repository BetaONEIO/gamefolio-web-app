import { cn } from "@/lib/utils";

interface GamefolioCollectionIconProps {
  className?: string;
}

export function GamefolioCollectionIcon({ className }: GamefolioCollectionIconProps) {
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
      {/* Chest base */}
      <path d="M3.5 12h17v7.5c0 .6-.4 1-1 1H4.5c-.6 0-1-.4-1-1V12z" />
      {/* Chest lid */}
      <path d="M3.5 12V9c0-.6.4-1 1-1h14c.6 0 1 .4 1 1v3" />
      {/* Lid divider line */}
      <line x1="3.5" y1="12" x2="20.5" y2="12" />
      {/* Lock plate */}
      <rect x="9.5" y="13.5" width="5" height="3.5" rx="0.5" />
      {/* Lock dot */}
      <circle cx="12" cy="15.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
