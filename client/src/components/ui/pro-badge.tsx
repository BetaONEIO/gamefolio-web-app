import proBadgeIcon from "@assets/Pro_badge_1767730160876.png";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProBadgeProps {
  isPro: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export function ProBadge({ isPro, size = "md" }: ProBadgeProps) {
  if (!isPro) return null;

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
            src={proBadgeIcon} 
            alt="Pro" 
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
          <p className="text-xs">Pro</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ProBadge;
