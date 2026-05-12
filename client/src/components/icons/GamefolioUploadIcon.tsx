import { cn } from "@/lib/utils";

interface GamefolioUploadIconProps {
  className?: string;
}

export function GamefolioUploadIcon({ className }: GamefolioUploadIconProps) {
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
      {/* Hexagonal frame */}
      <path d="M12 2L20.5 7V17L12 22L3.5 17V7Z" />
      {/* Upload arrow shaft */}
      <line x1="12" y1="8" x2="12" y2="15.5" />
      {/* Arrow head */}
      <path d="M9 11l3-3 3 3" />
      {/* Bottom accent dot */}
      <circle cx="12" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
