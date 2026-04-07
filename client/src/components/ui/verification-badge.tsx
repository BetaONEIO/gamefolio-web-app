import greenBadgeIcon from "@assets/green_badge_128_1758978841463.png";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerificationBadgeProps {
  isVerified: boolean;
  badgeImageUrl?: string | null;
  badgeName?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  isModerator?: boolean;
}

export function VerificationBadge({ isVerified, badgeImageUrl, badgeName, size = "md", isModerator = false }: VerificationBadgeProps) {
  if (!isVerified) return null;

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5", 
    lg: "w-6 h-6",
    xl: "w-8 h-8"
  };

  const tooltipText = "Gamefolio Pro member";
  const imgSrc = badgeImageUrl || greenBadgeIcon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <img 
            src={imgSrc} 
            alt="Verified" 
            className={`${sizeClasses[size]} ml-1`}
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
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default VerificationBadge;
