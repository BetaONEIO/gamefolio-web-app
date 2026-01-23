import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import badgeIcon56 from "@assets/yellow_badge_56x56_1759744373125.png";
import badgeIcon40 from "@assets/yellow_badge_40x40_1759744552084.png";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LevelBadgeWithProgressProps {
  userId: number;
  level: number;
  size?: "small" | "large";
  className?: string;
  username?: string;
}

interface LevelProgress {
  level: number;
  currentXP: number;
  currentPoints: number;
  pointsForCurrentLevel: number;
  pointsForNextLevel: number;
  pointsRemaining: number;
  progressPercent: number;
}

export function LevelBadgeWithProgress({ 
  userId, 
  level, 
  size = "small",
  className = "",
  username
}: LevelBadgeWithProgressProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [showLevelDialog, setShowLevelDialog] = useState(false);
  const isOwnProfile = user?.id === userId;
  
  const { data: progress } = useQuery<LevelProgress>({
    queryKey: ["/api/user", userId, "level-progress"],
    queryFn: async () => {
      const response = await fetch(`/api/user/${userId}/level-progress`);
      if (!response.ok) throw new Error("Failed to fetch level progress");
      return response.json();
    },
  });

  const isSmall = size === "small";
  const badgeSize = 56;
  const badgeIcon = badgeIcon56;
  const svgSize = 66;
  const radius = 24;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = progress?.progressPercent || 0;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const tooltipContent = progress 
    ? `${Math.round(progress.currentPoints).toLocaleString()} XP`
    : `Level ${level}`;

  return (
    <>
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`relative ${className} cursor-pointer`} 
            data-testid="level-badge-with-progress"
            onClick={() => isOwnProfile ? setLocation("/level-tracker") : setShowLevelDialog(true)}
          >
            {/* SVG Progress Ring */}
            <svg
              className="absolute inset-0 -rotate-90"
              width={svgSize}
              height={svgSize}
              style={{
                left: "-5px",
                top: "-5px",
              }}
            >
              {/* Background circle */}
              <circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth={strokeWidth}
              />
              {/* Progress circle */}
              <circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={radius}
                fill="none"
                stroke="#EAB308"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: "stroke-dashoffset 0.5s ease",
                }}
              />
            </svg>

            {/* Custom Badge with Dynamic Level Number */}
            <div 
              className="relative z-10 flex items-center justify-center shadow-lg"
              style={{
                width: `${badgeSize}px`,
                height: `${badgeSize}px`,
              }}
              data-testid="level-badge"
            >
              {/* Custom Badge Image */}
              <img 
                src={badgeIcon} 
                alt="Level Badge"
                className="absolute inset-0 w-full h-full object-contain"
                style={{
                  userSelect: 'none',
                  WebkitUserDrag: 'none',
                  pointerEvents: 'none'
                } as React.CSSProperties}
                draggable="false"
                onContextMenu={(e) => e.preventDefault()}
              />
              {/* Dynamic Level Number */}
              <span 
                className="relative z-10 font-bold text-black"
                style={{
                  fontSize: "18px",
                  textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
                }}
              >
                {level || 1}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-sm">
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    {/* Level info dialog for other users */}
    <Dialog open={showLevelDialog} onOpenChange={setShowLevelDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {username ? `${username}'s Level` : 'User Level'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center py-6">
          <div className="relative mb-4">
            <svg
              className="-rotate-90"
              width={100}
              height={100}
            >
              <circle
                cx={50}
                cy={50}
                r={42}
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth={6}
              />
              <circle
                cx={50}
                cy={50}
                r={42}
                fill="none"
                stroke="#EAB308"
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42}
                strokeDashoffset={(2 * Math.PI * 42) - (progressPercent / 100) * (2 * Math.PI * 42)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <img 
                src={badgeIcon56} 
                alt="Level Badge"
                className="w-14 h-14 object-contain"
              />
              <span className="absolute font-bold text-black text-xl">
                {level || 1}
              </span>
            </div>
          </div>
          <p className="text-2xl font-bold mb-1">Level {level || 1}</p>
          {progress && (
            <p className="text-muted-foreground">
              {Math.round(progress.currentPoints).toLocaleString()} XP
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
