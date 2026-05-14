import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

export function LevelTrackerIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-4 h-4", className)}
      aria-hidden
    >
      <rect x="2" y="15" width="4" height="7" rx="0.5" />
      <rect x="9" y="10" width="4" height="12" rx="0.5" />
      <rect x="16" y="5" width="4" height="17" rx="0.5" />
      <polyline points="16 2 20 2 20 6" />
      <line x1="12" y1="7" x2="20" y2="2" />
    </svg>
  );
}

export function ReferFriendIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-4 h-4", className)}
      aria-hidden
    >
      <circle cx="6" cy="8" r="3" />
      <path d="M2 21v-1a4 4 0 0 1 4-4h0" />
      <circle cx="18" cy="8" r="3" />
      <path d="M22 21v-1a4 4 0 0 0-4-4h0" />
      <path d="M12 13v-2m0 0V9m0 2H9m3 0h3" />
    </svg>
  );
}

export function GoProIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-4 h-4", className)}
      aria-hidden
    >
      <polygon
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        strokeWidth="1.8"
      />
      <line x1="12" y1="8" x2="12" y2="13" strokeWidth="2" />
      <line x1="12" y1="15" x2="12" y2="16" strokeWidth="2.5" />
    </svg>
  );
}

export function ManageProIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-4 h-4", className)}
      aria-hidden
    >
      <path d="M2 17l3-9 4 5 3-8 4 5 3-9" />
      <line x1="2" y1="20" x2="22" y2="20" />
      <circle cx="17" cy="5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="7" cy="8" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AccountSettingsIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-4 h-4", className)}
      aria-hidden
    >
      <line x1="4" y1="6" x2="8" y2="6" />
      <line x1="10" y1="6" x2="20" y2="6" />
      <circle cx="9" cy="6" r="2" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="16" y1="12" x2="20" y2="12" />
      <circle cx="15" cy="12" r="2" />
      <line x1="4" y1="18" x2="10" y2="18" />
      <line x1="12" y1="18" x2="20" y2="18" />
      <circle cx="11" cy="18" r="2" />
    </svg>
  );
}

export function ProfileAppearanceIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-4 h-4", className)}
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      <circle cx="5" cy="19" r="0" />
      <line x1="14" y1="6" x2="18" y2="10" />
    </svg>
  );
}

export function AdminPanelIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-4 h-4", className)}
      aria-hidden
    >
      <path d="M12 2l8 3v6c0 4.4-3.4 8.6-8 10C7.4 19.6 4 15.4 4 11V5l8-3z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-4 h-4", className)}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="3" x2="12" y2="12" />
      <path d="M8 6.5A7 7 0 1 0 16 6.5" />
    </svg>
  );
}
