import greenBadgeIcon from "@assets/green_badge_128_1758978841463.png";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProBadgeProps {
  isPro?: boolean;
  selectedVerificationBadgeId?: number | null;
  size?: "sm" | "md" | "lg" | "xl";
}

export function ProBadge({ selectedVerificationBadgeId, size = "md" }: ProBadgeProps) {
  if (!selectedVerificationBadgeId) return null;

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5", 
    lg: "w-6 h-6",
    xl: "w-8 h-8"
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <img 
            src={greenBadgeIcon} 
            alt="Verified" 
            className={`${sizeClasses[size]} ml-1`}
            loading="eager"
            decoding="async"
            style={{
              userSelect: 'none',
              WebkitUserDrag: 'none',
              pointerEvents: 'none'
            } as React.CSSProperties}
            draggable="false"
            onContextMenu={(e) => e.preventDefault()}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Verified Gamefolio member</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ProBadge;
