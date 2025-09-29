import { useState, useEffect, useCallback } from 'react';

interface AudioPreferences {
  muted: boolean;
  volume: number;
}

const STORAGE_KEY = 'gamefolio-video-audio-preferences';

const DEFAULT_PREFERENCES: AudioPreferences = {
  muted: true, // Start muted for autoplay compliance
  volume: 1.0
};

export function useVideoAudioPreference() {
  const [preferences, setPreferences] = useState<AudioPreferences>(DEFAULT_PREFERENCES);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AudioPreferences;
        setPreferences({
          muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_PREFERENCES.muted,
          volume: typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1 
            ? parsed.volume 
            : DEFAULT_PREFERENCES.volume
        });
      }
    } catch (error) {
      console.warn('Failed to load video audio preferences:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save preferences to localStorage whenever they change
  const updatePreferences = useCallback((newPreferences: Partial<AudioPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPreferences };
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save video audio preferences:', error);
      }
      
      return updated;
    });
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    updatePreferences({ muted });
  }, [updatePreferences]);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    updatePreferences({ 
      volume: clampedVolume,
      muted: clampedVolume === 0
    });
  }, [updatePreferences]);

  const toggleMuted = useCallback(() => {
    setMuted(!preferences.muted);
  }, [preferences.muted, setMuted]);

  return {
    muted: preferences.muted,
    volume: preferences.volume,
    isInitialized,
    setMuted,
    setVolume,
    toggleMuted
  };
}