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
      fill="none" 
      stroke="currentColor"
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={cn("w-6 h-6", className)}
      aria-hidden="true"
    >
      <g transform="translate(12 12) scale(1.15) translate(-12 -12)">
        <circle cx="12" cy="8.2" r="2.3"/>
        <path d="M6.8 17.2c1.4-2.6 3.4-3.9 5.2-3.9s3.8 1.3 5.2 3.9"/>
        <path d="M7.6 20h8.8"/>
        <path d="M7.6 20h4.2"/>
        <path d="M16.8 19.2v1.6"/>
      </g>
    </svg>
  );
}
