import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface StreakOverlayData {
  dailyXP: number;
  bonusAwarded: number;
  currentStreak: number;
  longestStreak: number;
  isNewMilestone: boolean;
  message: string;
  nextMilestone: number;
}

type OverlayStep = "hidden" | "xp" | "streak";

interface DailyStreakContextType {
  overlayStep: OverlayStep;
  streakData: StreakOverlayData | null;
  showDailyXp: (data: StreakOverlayData) => void;
  advanceToStreak: () => void;
  dismiss: () => void;
}

const DailyStreakContext = createContext<DailyStreakContextType | undefined>(undefined);

export function DailyStreakProvider({ children }: { children: ReactNode }) {
  const [overlayStep, setOverlayStep] = useState<OverlayStep>("hidden");
  const [streakData, setStreakData] = useState<StreakOverlayData | null>(null);

  const showDailyXp = useCallback((data: StreakOverlayData) => {
    setStreakData(data);
    setOverlayStep("xp");
  }, []);

  const advanceToStreak = useCallback(() => {
    if (streakData && streakData.currentStreak >= 2) {
      setOverlayStep("streak");
    } else {
      setOverlayStep("hidden");
      setStreakData(null);
    }
  }, [streakData]);

  const dismiss = useCallback(() => {
    setOverlayStep("hidden");
    setStreakData(null);
  }, []);

  return (
    <DailyStreakContext.Provider
      value={{ overlayStep, streakData, showDailyXp, advanceToStreak, dismiss }}
    >
      {children}
    </DailyStreakContext.Provider>
  );
}

export function useDailyStreak() {
  const context = useContext(DailyStreakContext);
  if (!context) {
    throw new Error("useDailyStreak must be used within a DailyStreakProvider");
  }
  return context;
}
