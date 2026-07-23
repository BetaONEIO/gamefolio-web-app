import ambassadorBadgeIcon from "@assets/ambassador-badge-icon.png";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AmbassadorBadgeProps {
  isAmbassador?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export function AmbassadorBadge({ isAmbassador, size = "md" }: AmbassadorBadgeProps) {
  if (!isAmbassador) return null;

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center ml-1" style={{ lineHeight: 0 }}>
            <img
              src={ambassadorBadgeIcon}
              alt="Gamefolio Ambassador"
              className={sizeClasses[size]}
              loading="eager"
              decoding="async"
              style={{
                userSelect: 'none',
                WebkitUserDrag: 'none',
                pointerEvents: 'none',
              } as React.CSSProperties}
              draggable="false"
              onContextMenu={(e) => e.preventDefault()}
            />
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
