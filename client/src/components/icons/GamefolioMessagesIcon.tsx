import { cn } from "@/lib/utils";

interface GamefolioMessagesIconProps {
  className?: string;
}

export function GamefolioMessagesIcon({ className }: GamefolioMessagesIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg"
      width="24" 
      height="24" 
      viewBox="0 0 24 24"
      fill="none" 
      stroke="currentColor"
      strokeWidth="1.2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={cn("w-6 h-6", className)}
      aria-hidden="true"
    >
      <g transform="translate(12 12) scale(1.15) translate(-12 -12)">
        <path d="M7.5 6.8h9c1.6 0 2.8 1.2 2.8 2.8v2.8c0 1.6-1.2 2.8-2.8 2.8h-4.5L9.8 17.8v-2.2H7.5c-1.6 0-2.8-1.2-2.8-2.8V9.6c0-1.6 1.2-2.8 2.8-2.8z"/>
        <circle cx="10" cy="11.2" r="0.8" fill="currentColor" stroke="none"/>
        <circle cx="12" cy="11.2" r="0.8" fill="currentColor" stroke="none"/>
        <circle cx="14" cy="11.2" r="0.8" fill="currentColor" stroke="none"/>
      </g>
    </svg>
  );
}
