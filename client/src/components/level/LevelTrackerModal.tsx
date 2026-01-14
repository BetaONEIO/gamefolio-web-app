import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy,
  Sparkles
} from "lucide-react";

interface LevelTrackerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: number;
  totalXP: number;
  username?: string;
  xpDelta?: number | null;
  previousXP?: number | null;
}

const LEVEL_THRESHOLDS = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 100 },
  { level: 3, xpRequired: 500 },
  { level: 4, xpRequired: 1500 },
  { level: 5, xpRequired: 3500 },
  { level: 6, xpRequired: 7000 },
  { level: 7, xpRequired: 14000 },
  { level: 8, xpRequired: 28000 },
  { level: 9, xpRequired: 56000 },
  { level: 10, xpRequired: 100000 },
];

function AnimatedStars() {
  const stars = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 3,
      duration: Math.random() * 2 + 2,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white/20 animate-pulse"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function LevelBadge({ level, progress, size = 120 }: { level: number; progress: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#levelGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ADE80" />
            <stop offset="50%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#4ADE80" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Trophy className="w-6 h-6 text-primary mb-1" />
        <span className="text-3xl font-bold text-foreground">{level}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Level</span>
      </div>
    </div>
  );
}

export function LevelTrackerModal({ 
  open, 
  onOpenChange, 
  level, 
  totalXP, 
  username,
  xpDelta,
  previousXP
}: LevelTrackerModalProps) {
  const [animatedXP, setAnimatedXP] = useState(totalXP);
  const [showXpGain, setShowXpGain] = useState(false);

  const targetXP = (xpDelta && previousXP !== null && previousXP !== undefined) 
    ? previousXP + xpDelta 
    : totalXP;

  useEffect(() => {
    if (open && xpDelta && previousXP !== null && previousXP !== undefined) {
      setAnimatedXP(previousXP);
      setShowXpGain(true);
      
      const animationDuration = 1500;
      const startTime = Date.now();
      const startXP = previousXP;
      const endXP = previousXP + xpDelta;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentXP = startXP + (endXP - startXP) * easeOut;
        
        setAnimatedXP(currentXP);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setTimeout(() => setShowXpGain(false), 2000);
        }
      };
      
      const timeout = setTimeout(() => {
        requestAnimationFrame(animate);
      }, 500);
      
      return () => clearTimeout(timeout);
    } else {
      setAnimatedXP(totalXP);
      setShowXpGain(false);
    }
  }, [open, xpDelta, previousXP, totalXP]);

  const displayXP = xpDelta ? animatedXP : totalXP;
  const currentLevelData = LEVEL_THRESHOLDS.find(t => t.level === level) || LEVEL_THRESHOLDS[0];
  const nextLevelData = LEVEL_THRESHOLDS.find(t => t.level === level + 1);
  
  const xpForCurrentLevel = currentLevelData.xpRequired;
  const xpForNextLevel = nextLevelData?.xpRequired || currentLevelData.xpRequired * 2;
  const xpProgress = displayXP - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.min((xpProgress / xpNeeded) * 100, 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-[#0F1520] via-[#134E4A]/20 to-[#0F1520] border-border/50 overflow-hidden">
        <AnimatedStars />
        
        <DialogHeader className="relative z-10">
          <DialogTitle className="text-center text-xl font-bold text-foreground">
            Level Progress
          </DialogTitle>
        </DialogHeader>

        <div className="relative z-10 flex flex-col items-center py-4">
          <AnimatePresence>
            {showXpGain && xpDelta && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute -top-2 left-1/2 -translate-x-1/2 z-20"
              >
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/20 to-emerald-500/20 border border-primary/30 rounded-full">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-primary font-bold text-lg">+{xpDelta} XP</span>
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <LevelBadge level={level} progress={progressPercent} />
          
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              <motion.span 
                className="text-primary font-semibold"
                key={Math.round(xpProgress)}
              >
                {Math.round(xpProgress)}
              </motion.span>
              {" / "}
              <span>{xpNeeded} XP</span>
              {" to Level "}
              <span className="font-semibold">{level + 1}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total XP: <span className="text-foreground font-medium">{Math.round(displayXP)}</span>
            </p>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

export default LevelTrackerModal;
