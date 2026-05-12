import { cn } from "@/lib/utils";

interface GamefolioStoreIconProps {
  className?: string;
}

export function GamefolioStoreIcon({ className }: GamefolioStoreIconProps) {
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
      {/* Bag body */}
      <path d="M6.5 9.5h11l-1.5 9.5H8z" />
      {/* Bag handles */}
      <path d="M9.5 9.5V7.5a2.5 2.5 0 0 1 5 0v2" />
      {/* D-pad horizontal */}
      <path d="M9.5 14.5h2.5" />
      {/* D-pad vertical */}
      <path d="M10.75 13.25v2.5" />
      {/* Action button dot */}
      <circle cx="14.5" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
