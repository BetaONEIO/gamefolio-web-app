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
      <g transform="translate(12 12) scale(1.15) translate(-12 -12)">
        <path d="M6.2 12a5.8 5.8 0 1 1 5.8 5.8"/>
        <path d="M8.8 12a3.2 3.2 0 1 1 3.2 3.2"/>
        <path d="M12 12l4.7-2.7"/>
        <circle cx="15.8" cy="9.7" r="0.9" fill="currentColor" stroke="none"/>
      </g>
    </svg>
  );
}
