import { cn } from "@/lib/utils";

interface GamefolioHomeIconProps {
  className?: string;
}

export function GamefolioHomeIcon({ className }: GamefolioHomeIconProps) {
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
        <path d="M7.5 11.2 12 7.2l4.5 4"/>
        <path d="M9 11.8v5.2c0 .9.7 1.6 1.6 1.6h2.8c.9 0 1.6-.7 1.6-1.6v-5.2"/>
        <path d="M5.2 18.8c2 1.6 4.4 2.4 6.8 2.4s4.8-.8 6.8-2.4"/>
        <circle cx="12" cy="13.2" r="0.8" fill="currentColor" stroke="none"/>
      </g>
    </svg>
  );
}
