import moderatorIcon from "@assets/Moderator icon_1759008718821.png";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ModeratorBadgeProps {
  isModerator: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export function ModeratorBadge({ isModerator, size = "md" }: ModeratorBadgeProps) {
  if (!isModerator) return null;

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
            src={moderatorIcon} 
            alt="Moderator" 
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
          <p className="text-xs">This user is a moderator</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ModeratorBadge;