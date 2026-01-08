import { useState, useCallback, useEffect } from "react";
import { useRevenueCat } from "@/hooks/use-revenuecat";

interface AdManagerState {
  shouldShowAd: boolean;
  reelsWatched: number;
  lastAdShownAt: number | null;
}

interface UseAdManagerOptions {
  clipChance?: number;
  reelsInterval?: number;
}

const CLIP_AD_CHANCE = 0.25;
const REELS_AD_INTERVAL = 5;

export function useAdManager(options: UseAdManagerOptions = {}) {
  const { clipChance = CLIP_AD_CHANCE, reelsInterval = REELS_AD_INTERVAL } = options;
  const { isPro, isLoading: isProLoading } = useRevenueCat();
  
  const [state, setState] = useState<AdManagerState>({
    shouldShowAd: false,
    reelsWatched: 0,
    lastAdShownAt: null,
  });

  const shouldShowAdForClip = useCallback((): boolean => {
    if (isPro || isProLoading) return false;
    return Math.random() < clipChance;
  }, [isPro, isProLoading, clipChance]);

  const shouldShowAdForReel = useCallback((): boolean => {
    if (isPro || isProLoading) return false;
    const nextCount = state.reelsWatched + 1;
    return nextCount % reelsInterval === 0;
  }, [isPro, isProLoading, state.reelsWatched, reelsInterval]);

  const recordReelWatched = useCallback(() => {
    setState(prev => ({
      ...prev,
      reelsWatched: prev.reelsWatched + 1,
    }));
  }, []);

  const checkAndShowAdForClip = useCallback((): boolean => {
    if (isPro || isProLoading) return false;
    
    const showAd = shouldShowAdForClip();
    if (showAd) {
      setState(prev => ({
        ...prev,
        shouldShowAd: true,
        lastAdShownAt: Date.now(),
      }));
    }
    return showAd;
  }, [isPro, isProLoading, shouldShowAdForClip]);

  const checkAndShowAdForReel = useCallback((): boolean => {
    if (isPro || isProLoading) return false;
    
    const showAd = shouldShowAdForReel();
    recordReelWatched();
    
    if (showAd) {
      setState(prev => ({
        ...prev,
        shouldShowAd: true,
        lastAdShownAt: Date.now(),
      }));
    }
    return showAd;
  }, [isPro, isProLoading, shouldShowAdForReel, recordReelWatched]);

  const onAdComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      shouldShowAd: false,
    }));
  }, []);

  const resetReelCount = useCallback(() => {
    setState(prev => ({
      ...prev,
      reelsWatched: 0,
    }));
  }, []);

  const isProUser = isPro && !isProLoading;

  return {
    shouldShowAd: state.shouldShowAd,
    reelsWatched: state.reelsWatched,
    isProUser,
    isProLoading,
    
    shouldShowAdForClip,
    shouldShowAdForReel,
    checkAndShowAdForClip,
    checkAndShowAdForReel,
    recordReelWatched,
    onAdComplete,
    resetReelCount,
  };
}

export function useClipAdDecision() {
  const { isPro, isLoading } = useRevenueCat();
  const [showAd, setShowAd] = useState(false);
  const [adCompleted, setAdCompleted] = useState(false);

  const decideAd = useCallback(() => {
    setAdCompleted(false);
    
    if (isPro || isLoading) {
      setShowAd(false);
      setAdCompleted(true);
      return false;
    }
    
    const shouldShow = Math.random() < CLIP_AD_CHANCE;
    setShowAd(shouldShow);
    if (!shouldShow) {
      setAdCompleted(true);
    }
    return shouldShow;
  }, [isPro, isLoading]);

  const onAdFinished = useCallback(() => {
    setShowAd(false);
    setAdCompleted(true);
  }, []);

  const reset = useCallback(() => {
    setShowAd(false);
    setAdCompleted(false);
  }, []);

  return {
    showAd,
    adCompleted,
    isPro: isPro && !isLoading,
    decideAd,
    onAdFinished,
    reset,
  };
}

export function useReelAdTracker() {
  const { isPro, isLoading } = useRevenueCat();
  const [reelCount, setReelCount] = useState(0);
  const [showAd, setShowAd] = useState(false);

  const onReelChange = useCallback((newIndex: number) => {
    if (isPro || isLoading) {
      setShowAd(false);
      return false;
    }

    const newCount = newIndex + 1;
    setReelCount(newCount);

    if (newCount > 0 && newCount % REELS_AD_INTERVAL === 0) {
      setShowAd(true);
      return true;
    }
    
    return false;
  }, [isPro, isLoading]);

  const onAdFinished = useCallback(() => {
    setShowAd(false);
  }, []);

  const reset = useCallback(() => {
    setReelCount(0);
    setShowAd(false);
  }, []);

  return {
    reelCount,
    showAd,
    isPro: isPro && !isLoading,
    onReelChange,
    onAdFinished,
    reset,
  };
}
