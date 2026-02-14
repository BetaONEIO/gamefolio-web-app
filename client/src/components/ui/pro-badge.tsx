import proBadgeIcon from "@assets/Gamefolio_pro_button_final_c_1771055092628.png";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProBadgeProps {
  isPro: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export function ProBadge({ isPro, size = "md" }: ProBadgeProps) {
  if (!isPro) return null;

  const sizeClasses = {
    sm: "h-4 w-auto",
    md: "h-5 w-auto", 
    lg: "h-6 w-auto",
    xl: "h-8 w-auto"
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <img 
            src={proBadgeIcon} 
            alt="Gamefolio Pro" 
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
          <p className="text-xs">Gamefolio Pro</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ProBadge;
