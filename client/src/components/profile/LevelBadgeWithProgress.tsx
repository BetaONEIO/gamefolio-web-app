import { Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface LevelBadgeWithProgressProps {
  userId: number;
  level: number;
  size?: "small" | "large";
  className?: string;
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
  className = ""
}: LevelBadgeWithProgressProps) {
  const { data: progress } = useQuery<LevelProgress>({
    queryKey: ["/api/user", userId, "level-progress"],
    queryFn: async () => {
      const response = await fetch(`/api/user/${userId}/level-progress`);
      if (!response.ok) throw new Error("Failed to fetch level progress");
      return response.json();
    },
  });

  const isSmall = size === "small";
  const badgeSize = isSmall ? "w-10 h-10" : "w-14 h-14";
  const svgSize = isSmall ? 50 : 66;
  const radius = isSmall ? 18 : 24;
  const strokeWidth = isSmall ? 3 : 4;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = progress?.progressPercent || 0;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className={`relative ${className}`} data-testid="level-badge-with-progress">
      {/* SVG Progress Ring */}
      <svg
        className="absolute inset-0 -rotate-90"
        width={svgSize}
        height={svgSize}
        style={{
          left: isSmall ? "-4px" : "-6px",
          top: isSmall ? "-4px" : "-6px",
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

      {/* Level Badge */}
      <div 
        className={`relative z-10 flex items-center justify-center rounded-full bg-yellow-500 text-black font-bold shadow-lg ${badgeSize} ${isSmall ? "border-2" : "border-4"} border-background`}
        data-testid="level-badge"
      >
        <Trophy className={`${isSmall ? "w-4 h-4" : "w-5 h-5"} absolute ${isSmall ? "top-1 left-1" : "top-2 left-2"} text-yellow-700 opacity-30`} />
        <span className={`relative z-10 ${isSmall ? "text-sm" : "text-lg"}`}>{level || 1}</span>
      </div>
    </div>
  );
}
