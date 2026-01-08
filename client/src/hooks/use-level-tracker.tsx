import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface LevelTrackerState {
  isOpen: boolean;
  xpDelta: number | null;
  previousXP: number | null;
}

interface LevelTrackerContextValue {
  state: LevelTrackerState;
  showLevelTracker: (xpDelta?: number, previousXP?: number) => void;
  hideLevelTracker: () => void;
}

const LevelTrackerContext = createContext<LevelTrackerContextValue | null>(null);

interface LevelTrackerProviderProps {
  children: ReactNode;
}

export function LevelTrackerProvider({ children }: LevelTrackerProviderProps) {
  const [state, setState] = useState<LevelTrackerState>({
    isOpen: false,
    xpDelta: null,
    previousXP: null,
  });

  const showLevelTracker = useCallback((xpDelta?: number, previousXP?: number) => {
    setState({
      isOpen: true,
      xpDelta: xpDelta ?? null,
      previousXP: previousXP ?? null,
    });
  }, []);

  const hideLevelTracker = useCallback(() => {
    setState({
      isOpen: false,
      xpDelta: null,
      previousXP: null,
    });
  }, []);

  return (
    <LevelTrackerContext.Provider value={{ state, showLevelTracker, hideLevelTracker }}>
      {children}
    </LevelTrackerContext.Provider>
  );
}

export function useLevelTracker() {
  const context = useContext(LevelTrackerContext);
  if (!context) {
    throw new Error("useLevelTracker must be used within a LevelTrackerProvider");
  }
  return context;
}
