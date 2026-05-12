import { cn } from "@/lib/utils";

interface GamefolioAdminIconProps {
  className?: string;
}

export function GamefolioAdminIcon({ className }: GamefolioAdminIconProps) {
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
      {/* Shield */}
      <path d="M12 2.5L20 7V13.5C20 17.5 16.5 21 12 22C7.5 21 4 17.5 4 13.5V7Z" />
      {/* Lightning bolt (admin/power symbol) */}
      <path d="M13.5 8.5L10.5 13H13L10.5 17.5L14.5 12.5H12Z" />
    </svg>
  );
}
