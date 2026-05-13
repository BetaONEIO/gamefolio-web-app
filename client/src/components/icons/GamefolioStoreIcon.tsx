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
      <path d="M3 9h18l-2 12H5z" />
      {/* Bag handles */}
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      {/* D-pad horizontal */}
      <path d="M7 15h5" />
      {/* D-pad vertical */}
      <path d="M9.5 12.5v5" />
      {/* Action button dots */}
      <circle cx="15.5" cy="13.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
