import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PartnerBadgeProps {
  isPartner?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export function PartnerBadge({ isPartner, size = "md" }: PartnerBadgeProps) {
  if (!isPartner) return null;

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
              aria-label="Gamefolio Partner"
              style={{ display: 'block', flexShrink: 0 }}
            >
              <defs>
                <linearGradient id="partner-badge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#B7FF1A" />
                  <stop offset="100%" stopColor="#FFD700" />
                </linearGradient>
              </defs>
              {/* 5-pointed star */}
              <path
                d="M12 2L14.928 8.472L22 9.492L17 14.354L18.236 21.394L12 18.056L5.764 21.394L7 14.354L2 9.492L9.072 8.472L12 2Z"
                fill="url(#partner-badge-grad)"
              />
            </svg>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Gamefolio Partner</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default PartnerBadge;
