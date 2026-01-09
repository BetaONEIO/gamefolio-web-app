import { cn } from "@/lib/utils";

interface GamefolioTrendingIconProps {
  className?: string;
}

export function GamefolioTrendingIcon({ className }: GamefolioTrendingIconProps) {
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
        <path d="M12 3.2C10.1 5.9 10.9 7.4 9.6 9C8.6 10.3 8 11.6 8 13.3C8 16.3 10.2 18.6 12.6 18.6C15 18.6 17.2 16.3 17.2 13.3C17.2 11.2 16.1 9.8 14.6 8.3C13.5 7.2 12.8 5.9 12.6 4.7C12.5 4.1 12.3 3.7 12 3.2Z"/>
        <path d="M12.4 11C11.6 12 11.3 12.7 11.3 13.6C11.3 15 12.3 16 13.5 16C14.6 16 15.5 15.1 15.5 13.8C15.5 12.9 15 12.1 14.2 11.4C13.6 10.9 13.1 10.4 12.9 9.7Z"/>
      </g>
    </svg>
  );
}
