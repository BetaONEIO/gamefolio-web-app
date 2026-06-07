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
      {/* Roof */}
      <path d="M2 11.5 12 3l10 8.5" />
      {/* House body */}
      <path d="M5 10.5v10c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5v-10" />
      {/* Bottom arc */}
      <path d="M4 20c2.5 1.8 5.2 2.7 8 2.7s5.5-.9 8-2.7" />
      {/* Controller dot */}
      <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
