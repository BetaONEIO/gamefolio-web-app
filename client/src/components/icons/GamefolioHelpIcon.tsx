import { cn } from "@/lib/utils";

interface GamefolioHelpIconProps {
  className?: string;
}

export function GamefolioHelpIcon({ className }: GamefolioHelpIconProps) {
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
      {/* Headband arc */}
      <path d="M5.5 11.5a6.5 6.5 0 0 1 13 0" />
      {/* Left earpiece */}
      <rect x="3" y="11" width="3.5" height="5.5" rx="1.5" />
      {/* Right earpiece */}
      <rect x="17.5" y="11" width="3.5" height="5.5" rx="1.5" />
      {/* Boom mic arm */}
      <path d="M17.5 16.5c0 2.5-2.5 3-5.5 3" />
      {/* Mic tip dot */}
      <circle cx="12" cy="19.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
