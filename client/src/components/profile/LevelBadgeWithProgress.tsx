import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
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

  const progressPercent = progress?.progressPercent || 0;

  const tooltipContent = progress 
    ? `${Math.round(progress.currentPoints).toLocaleString()} XP`
    : `Level ${level}`;

  return (
    <>
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer focus:outline-none ${className}`}
            style={{
              background: '#0B1218',
              border: '1px solid #B7FF1A',
              boxShadow: '0 0 6px rgba(183, 255, 26, 0.45), 0 0 2px rgba(183, 255, 26, 0.7)',
            }}
            data-testid="level-badge-with-progress"
            onClick={() => isOwnProfile ? setLocation("/level-tracker") : setShowLevelDialog(true)}
          >
            <span
              className="font-bold leading-none"
              style={{
                color: '#B7FF1A',
                fontSize: size === 'large' ? '11px' : '10px',
                letterSpacing: '0.03em',
              }}
            >
              LVL {level || 1}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-sm">
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    {/* Level info dialog for other users */}
    <Dialog open={showLevelDialog} onOpenChange={setShowLevelDialog}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {username ? `${username}'s Level` : 'User Level'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center py-6 gap-3">
          <div
            className="flex items-center justify-center w-20 h-20 rounded-full"
            style={{
              background: '#0B1218',
              border: '2px solid #B7FF1A',
              boxShadow: '0 0 16px rgba(183, 255, 26, 0.5), 0 0 4px rgba(183, 255, 26, 0.8)',
              position: 'relative',
            }}
          >
            {/* XP arc progress ring */}
            <svg
              className="absolute inset-0 -rotate-90"
              width={80}
              height={80}
              style={{ left: 0, top: 0 }}
            >
              <circle
                cx={40}
                cy={40}
                r={36}
                fill="none"
                stroke="rgba(183, 255, 26, 0.12)"
                strokeWidth={3}
              />
              <circle
                cx={40}
                cy={40}
                r={36}
                fill="none"
                stroke="#B7FF1A"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 36}
                strokeDashoffset={(2 * Math.PI * 36) - (progressPercent / 100) * (2 * Math.PI * 36)}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <span className="relative z-10 font-bold text-2xl" style={{ color: '#B7FF1A' }}>
              {level || 1}
            </span>
          </div>
          <p className="text-xl font-bold">Level {level || 1}</p>
          {progress && (
            <p className="text-muted-foreground text-sm">
              {Math.round(progress.currentPoints).toLocaleString()} XP &nbsp;·&nbsp; {Math.round(progressPercent)}% to next level
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
