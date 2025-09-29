import { useSyncExternalStore, useCallback } from 'react';

interface AudioPreferences {
  muted: boolean;
  volume: number;
}

const STORAGE_KEY = 'gamefolio-video-audio-preferences';

const DEFAULT_PREFERENCES: AudioPreferences = {
  muted: true, // Start muted for autoplay compliance
  volume: 1.0
};

// Global store for video audio preferences
class VideoAudioStore {
  private preferences: AudioPreferences = DEFAULT_PREFERENCES;
  private listeners = new Set<() => void>();
  private isInitialized = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AudioPreferences;
        this.preferences = {
          muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_PREFERENCES.muted,
          volume: typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1 
            ? parsed.volume 
            : DEFAULT_PREFERENCES.volume
        };
      }
    } catch (error) {
      console.warn('Failed to load video audio preferences:', error);
    } finally {
      this.isInitialized = true;
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Failed to save video audio preferences:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  getSnapshot = () => {
    return { ...this.preferences, isInitialized: this.isInitialized };
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setMuted = (muted: boolean) => {
    if (this.preferences.muted !== muted) {
      this.preferences = { ...this.preferences, muted };
      this.saveToStorage();
      this.notifyListeners();
    }
  };

  setVolume = (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    const newMuted = clampedVolume === 0;
    
    if (this.preferences.volume !== clampedVolume || this.preferences.muted !== newMuted) {
      this.preferences = {
        volume: clampedVolume,
        muted: newMuted
      };
      this.saveToStorage();
      this.notifyListeners();
    }
  };

  toggleMuted = () => {
    this.setMuted(!this.preferences.muted);
  };
}

// Global store instance
const audioStore = new VideoAudioStore();

export function useVideoAudioPreference() {
  const state = useSyncExternalStore(audioStore.subscribe, audioStore.getSnapshot);

  const setMuted = useCallback((muted: boolean) => {
    audioStore.setMuted(muted);
  }, []);

  const setVolume = useCallback((volume: number) => {
    audioStore.setVolume(volume);
  }, []);

  const toggleMuted = useCallback(() => {
    audioStore.toggleMuted();
  }, []);

  return {
    muted: state.muted,
    volume: state.volume,
    isInitialized: state.isInitialized,
    setMuted,
    setVolume,
    toggleMuted
  };
}