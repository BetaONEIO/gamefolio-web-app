import { useQuery } from "@tanstack/react-query";
import badgeIcon56 from "@assets/yellow_badge_56x56_1759744373125.png";
import badgeIcon40 from "@assets/yellow_badge_40x40_1759744552084.png";

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
  const badgeSize = isSmall ? 40 : 56;
  const badgeIcon = isSmall ? badgeIcon40 : badgeIcon56;
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
        />
        {/* Dynamic Level Number */}
        <span 
          className="relative z-10 font-bold text-black"
          style={{
            fontSize: isSmall ? "14px" : "18px",
            textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
          }}
        >
          {level || 1}
        </span>
      </div>
    </div>
  );
}
