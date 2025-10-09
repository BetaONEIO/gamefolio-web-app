import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface XPGainedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  xpGained: number;
  currentXP: number;
  currentLevel: number;
  onContinue?: () => void;
}

// Level thresholds matching server/level-system.ts
const LEVEL_THRESHOLDS: { [level: number]: number } = {
  1: 0,
  2: 100,
  3: 500,
  4: 1000,
  5: 2000,
  6: 3500,
  7: 5500,
  8: 8000,
  9: 11000,
  10: 15000,
  11: 20000,
  12: 26000,
  13: 33000,
  14: 41000,
  15: 50000,
};

function getPointsForNextLevel(currentLevel: number): number {
  if (currentLevel >= 50) {
    return 995000 + (currentLevel - 49) * 50000;
  }
  return LEVEL_THRESHOLDS[currentLevel + 1] || 15000;
}

function calculateProgress(currentXP: number, xpGained: number, currentLevel: number) {
  const pointsForCurrentLevel = LEVEL_THRESHOLDS[currentLevel] || 0;
  const pointsForNextLevel = getPointsForNextLevel(currentLevel);
  const pointsNeededForLevel = pointsForNextLevel - pointsForCurrentLevel;
  
  // Calculate old progress (before XP gain)
  const oldPointsIntoLevel = currentXP - pointsForCurrentLevel;
  const oldProgress = (oldPointsIntoLevel / pointsNeededForLevel) * 100;
  
  // Calculate new progress (after XP gain)
  const newPointsIntoLevel = (currentXP + xpGained) - pointsForCurrentLevel;
  const newProgress = Math.min(100, (newPointsIntoLevel / pointsNeededForLevel) * 100);
  
  return { oldProgress, newProgress };
}

export function XPGainedDialog({ 
  open, 
  onOpenChange, 
  xpGained, 
  currentXP, 
  currentLevel,
  onContinue 
}: XPGainedDialogProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open) {
      const { oldProgress, newProgress } = calculateProgress(currentXP, xpGained, currentLevel);
      
      // Start from old progress
      setProgress(oldProgress);
      
      // Animate to new progress
      const timer = setTimeout(() => {
        setProgress(newProgress);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [open, currentXP, xpGained, currentLevel]);

  const handleContinue = () => {
    onOpenChange(false);
    if (onContinue) {
      onContinue();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogOverlay className="bg-black/80 backdrop-blur-sm" />
      <DialogContent 
        className="sm:max-w-md !border-none p-12 !shadow-none [&>button]:hidden"
        style={{ 
          background: 'transparent',
          backgroundColor: 'transparent',
          border: 'none',
          boxShadow: 'none'
        }}
      >
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Circular progress ring */}
          <div className="relative w-64 h-64">
            <svg className="transform -rotate-90 w-64 h-64">
              {/* Background circle */}
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="rgb(75, 85, 99)"
                strokeWidth="12"
                fill="none"
                className="opacity-40"
              />
              
              {/* Progress circle with gradient */}
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#86efac" />
                </linearGradient>
              </defs>
              
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="url(#progressGradient)"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 110}`}
                strokeDashoffset={`${2 * Math.PI * 110 * (1 - progress / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: "drop-shadow(0 0 8px rgba(34, 197, 94, 0.6))"
                }}
              />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <CloudUpload className="w-20 h-20 text-white mb-4" strokeWidth={2} />
              <div className="text-4xl font-bold text-green-400 animate-pulse">
                +{xpGained} xp
              </div>
            </div>
          </div>

          {/* Level progression text */}
          <div className="text-white/80 text-lg font-medium">
            Level {currentLevel} → Level {currentLevel + 1}
          </div>

          {/* Continue button */}
          <Button
            onClick={handleContinue}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold rounded-lg transition-all"
            data-testid="button-continue-xp"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
