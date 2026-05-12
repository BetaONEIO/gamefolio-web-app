import { cn } from "@/lib/utils";

interface GamefolioProfileSettingsIconProps {
  className?: string;
}

export function GamefolioProfileSettingsIcon({ className }: GamefolioProfileSettingsIconProps) {
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
      <circle cx="9" cy="9" r="3.2" />
      <path d="M3.5 20c.9-3.2 3-4.8 5.5-4.8S13.6 16.8 14.5 20" />
      <circle cx="17.5" cy="8.5" r="2.2" />
      <path d="M17.5 11.7v3.1" />
      <path d="M15.8 14.3h3.4" />
      <circle cx="17.5" cy="14.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
