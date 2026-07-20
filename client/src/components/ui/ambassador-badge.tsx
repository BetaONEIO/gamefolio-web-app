import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AmbassadorBadgeProps {
  isAmbassador?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export function AmbassadorBadge({ isAmbassador, size = "md" }: AmbassadorBadgeProps) {
  if (!isAmbassador) return null;

  const sizes = { sm: 16, md: 20, lg: 24, xl: 32 };
  const px = sizes[size];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center ml-1 cursor-default select-none" style={{ pointerEvents: 'none' }}>
            <svg
              width={px}
              height={px}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Gamefolio Ambassador"
              style={{ display: 'block', flexShrink: 0 }}
            >
              <defs>
                <linearGradient id="ambassador-badge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#6366F1" />
                </linearGradient>
              </defs>
              {/* Medal: ribbon + circle */}
              <path
                d="M8.5 13.5L5 21L12 18.5L19 21L15.5 13.5"
                stroke="url(#ambassador-badge-grad)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="12" cy="9" r="6.5" fill="url(#ambassador-badge-grad)" />
              <path
                d="M12 5.5L13.11 7.86L15.7 8.24L13.85 10.04L14.29 12.62L12 11.41L9.71 12.62L10.15 10.04L8.3 8.24L10.89 7.86L12 5.5Z"
                fill="white"
                fillOpacity="0.9"
              />
            </svg>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Gamefolio Ambassador</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default AmbassadorBadge;
