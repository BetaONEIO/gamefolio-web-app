import { cn } from "@/lib/utils";

interface GamefolioLeaderboardIconProps {
  className?: string;
}

export function GamefolioLeaderboardIcon({ className }: GamefolioLeaderboardIconProps) {
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
      <g transform="translate(12 12) scale(1.2) translate(-12 -12)">
        <path d="M10 6h4v8h-4z"/>
        <path d="M5.5 9h4v5h-4z"/>
        <path d="M14.5 10.5h4v3.5h-4z"/>
        <path d="M4.5 16.5h15"/>
        <path d="M3.5 19h17"/>
      </g>
    </svg>
  );
}
