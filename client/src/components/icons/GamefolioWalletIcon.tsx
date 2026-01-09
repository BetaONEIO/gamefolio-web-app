import { cn } from "@/lib/utils";

interface GamefolioWalletIconProps {
  className?: string;
}

export function GamefolioWalletIcon({ className }: GamefolioWalletIconProps) {
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
        <path d="M5 8.5h14c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-5c0-1.1.9-2 2-2z"/>
        <path d="M5 8.5V7c0-1.1.9-2 2-2h8"/>
        <circle cx="16.5" cy="13" r="0.9" fill="currentColor" stroke="none"/>
      </g>
    </svg>
  );
}
