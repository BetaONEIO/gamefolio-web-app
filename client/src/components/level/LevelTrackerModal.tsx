import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

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
  { level: 4, xpRequired: 1000 },
  { level: 5, xpRequired: 2000 },
  { level: 6, xpRequired: 3500 },
  { level: 7, xpRequired: 5500 },
  { level: 8, xpRequired: 8000 },
  { level: 9, xpRequired: 11000 },
  { level: 10, xpRequired: 15000 },
  { level: 11, xpRequired: 20000 },
  { level: 12, xpRequired: 26000 },
  { level: 13, xpRequired: 33000 },
  { level: 14, xpRequired: 41000 },
  { level: 15, xpRequired: 50000 },
];

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
  
  const calculateLevel = (xp: number) => {
    let currentLevel = 1;
    for (const threshold of LEVEL_THRESHOLDS) {
      if (xp >= threshold.xpRequired) {
        currentLevel = threshold.level;
      } else {
        break;
      }
    }
    return currentLevel;
  };
  
  const actualLevel = calculateLevel(displayXP);
  const currentLevelData = LEVEL_THRESHOLDS.find(t => t.level === actualLevel) || LEVEL_THRESHOLDS[0];
  const nextLevelData = LEVEL_THRESHOLDS.find(t => t.level === actualLevel + 1);
  
  const xpForCurrentLevel = currentLevelData.xpRequired;
  const xpForNextLevel = nextLevelData?.xpRequired || currentLevelData.xpRequired * 2;
  const xpProgress = displayXP - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.min((xpProgress / xpNeeded) * 100, 100);

  const circumference = 2 * Math.PI * 100;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const filledSegments = Math.floor(progressPercent / 20);

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="bg-[#0f172a]/95 backdrop-blur-sm border border-[#1e293b] text-white p-0 max-w-[340px] w-[calc(100%-48px)] mx-6 rounded-3xl overflow-hidden [&>button]:hidden"
        data-testid="dialog-level-progress"
      >
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <span className="text-2xl font-bold text-[#f8fafc]">Level Progress</span>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-[#1e293b] border border-[#1e293b] flex items-center justify-center hover:bg-[#334155] transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M22 12C22 17.523 17.523 22 12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12ZM8.97 8.97C9.26282 8.67755 9.73718 8.67755 10.03 8.97L12 10.94L13.97 8.97C14.2655 8.69464 14.726 8.70277 15.0116 8.98838C15.2972 9.27399 15.3054 9.73449 15.03 10.03L13.06 12L15.03 13.97C15.3054 14.2655 15.2972 14.726 15.0116 15.0116C14.726 15.2972 14.2655 15.3054 13.97 15.03L12 13.06L10.03 15.03C9.73449 15.3054 9.27399 15.2972 8.98838 15.0116C8.70277 14.726 8.69464 14.2655 8.97 13.97L10.94 12L8.97 10.03C8.67755 9.73718 8.67755 9.26282 8.97 8.97Z" fill="#94A3B8" />
              </svg>
            </button>
          </div>

          <AnimatePresence>
            {showXpGain && xpDelta && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex justify-center -mt-2 mb-2"
              >
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4ade80]/20 to-[#22d3ee]/20 border border-[#4ade80]/30 rounded-full">
                  <Sparkles className="w-4 h-4 text-[#4ade80] animate-pulse" />
                  <span className="text-[#4ade80] font-bold text-lg">+{xpDelta} XP</span>
                  <Sparkles className="w-4 h-4 text-[#4ade80] animate-pulse" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-56 h-56 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 224 224">
                <circle
                  cx="112"
                  cy="112"
                  r="100"
                  stroke="#1E293B"
                  strokeWidth="12"
                  fill="none"
                />
                <motion.circle
                  cx="112"
                  cy="112"
                  r="100"
                  stroke="#4ADE80"
                  strokeWidth="12"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
              
              <div className="flex flex-col items-center justify-center z-10">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M36.6663 13.6034V13.725C36.6663 15.1584 36.6663 15.8767 36.3213 16.4634C35.9763 17.05 35.348 17.3984 34.0946 18.0967L32.773 18.83C33.683 15.75 33.988 12.44 34.0996 9.61003L34.1163 9.2417L34.1196 9.15503C35.2046 9.5317 35.8146 9.81336 36.1946 10.34C36.6663 10.995 36.6663 11.865 36.6663 13.6034Z" fill="#EF4444" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M3.33301 13.6034V13.725C3.33301 15.1584 3.33301 15.8767 3.67801 16.4634C4.02301 17.05 4.65134 17.3984 5.90467 18.0967L7.228 18.83C6.31634 15.75 6.01134 12.44 5.89967 9.61003L5.883 9.2417L5.88134 9.15503C4.79467 9.5317 4.18467 9.81336 3.80467 10.34C3.33301 10.995 3.33301 11.8667 3.33301 13.6034Z" fill="#EF4444" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M19.9566 3.33301C22.9299 3.33301 25.3783 3.59468 27.2517 3.91135C29.15 4.23135 30.0983 4.39135 30.8917 5.36803C31.685 6.34471 31.6417 7.39972 31.5584 9.50974C31.2717 16.7582 29.7083 25.8099 21.2066 26.6099V32.5H23.5899C24.3841 32.5005 25.0676 33.0612 25.2233 33.84L25.54 35.4167H29.9567C30.647 35.4167 31.2067 35.9763 31.2067 36.6667C31.2067 37.3571 30.647 37.9167 29.9567 37.9167H9.95646C9.2661 37.9167 8.70645 37.357 8.70645 36.6667C8.70645 35.9763 9.2661 35.4167 9.95646 35.4167H14.3732L14.6899 33.84C14.8455 33.0612 15.5291 32.5005 16.3232 32.5H18.7066V26.6099C10.2049 25.8099 8.64156 16.7582 8.35489 9.50974C8.27156 7.39972 8.22823 6.34471 9.02156 5.36803C9.8149 4.39135 10.7632 4.23135 12.6616 3.91135C14.5349 3.59468 16.9832 3.33301 19.9566 3.33301Z" fill="#EF4444" />
                </svg>
                <motion.span 
                  className="text-[60px] font-black text-[#f8fafc] leading-[60px] mt-2"
                  key={actualLevel}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  {actualLevel}
                </motion.span>
                <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                  Level
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 px-6 pb-6">
            <div className="flex items-center gap-1">
              <motion.span 
                className="text-xl font-bold text-[#ef4444]"
                key={Math.round(xpProgress)}
              >
                {Math.round(xpProgress)}
              </motion.span>
              <span className="text-xl font-medium text-[#94a3b8]">/</span>
              <span className="text-xl font-medium text-[#f8fafc]">{xpNeeded} XP to Level</span>
              <span className="text-xl font-bold text-[#f8fafc]">{actualLevel + 1}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-[#94a3b8]">Total XP:</span>
              <motion.span 
                className="text-sm font-bold text-[#f8fafc]"
                key={Math.round(displayXP)}
              >
                {Math.round(displayXP)}
              </motion.span>
            </div>

            <div className="flex items-center gap-1 w-full max-w-[316px] mt-4">
              {[1, 2, 3, 4, 5].map((segment) => (
                <motion.div
                  key={segment}
                  className={`flex-1 h-1.5 rounded-full ${
                    segment <= filledSegments ? 'bg-[#4ade80]' : 'bg-[#1e293b]'
                  }`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: segment * 0.1, duration: 0.3 }}
                />
              ))}
            </div>
          </div>

          <div className="p-6 pt-4">
            <Button
              onClick={handleClose}
              className="w-full h-[60px] rounded-2xl bg-[#4ade80] hover:bg-[#22c55e] text-[#022c22] text-lg font-bold shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.1)]"
            >
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LevelTrackerModal;
