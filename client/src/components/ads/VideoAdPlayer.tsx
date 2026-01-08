import { useState, useEffect, useRef, useCallback } from "react";
import { X, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google: {
      ima: {
        AdDisplayContainer: new (container: HTMLElement, video?: HTMLVideoElement) => AdDisplayContainer;
        AdsLoader: new (container: AdDisplayContainer) => AdsLoader;
        AdsRequest: new () => AdsRequest;
        AdsRenderingSettings: new () => AdsRenderingSettings;
        AdsManagerLoadedEvent: {
          Type: {
            ADS_MANAGER_LOADED: string;
          };
        };
        AdErrorEvent: {
          Type: {
            AD_ERROR: string;
          };
        };
        AdEvent: {
          Type: {
            CONTENT_PAUSE_REQUESTED: string;
            CONTENT_RESUME_REQUESTED: string;
            ALL_ADS_COMPLETED: string;
            STARTED: string;
            COMPLETE: string;
            SKIPPED: string;
            LOADED: string;
            CLICK: string;
          };
        };
        ViewMode: {
          NORMAL: number;
        };
      };
    };
  }
}

interface AdDisplayContainer {
  initialize(): void;
  destroy(): void;
}

interface AdsLoader {
  addEventListener(event: string, callback: (e: any) => void, useCapture?: boolean): void;
  removeEventListener(event: string, callback: (e: any) => void): void;
  requestAds(request: AdsRequest): void;
  contentComplete(): void;
  destroy(): void;
}

interface AdsRequest {
  adTagUrl: string;
  linearAdSlotWidth: number;
  linearAdSlotHeight: number;
  nonLinearAdSlotWidth: number;
  nonLinearAdSlotHeight: number;
}

interface AdsRenderingSettings {
  restoreCustomPlaybackStateOnAdBreakComplete: boolean;
}

interface AdsManager {
  addEventListener(event: string, callback: (e: any) => void): void;
  init(width: number, height: number, viewMode: number): void;
  start(): void;
  destroy(): void;
  skip(): void;
  getRemainingTime(): number;
  getVolume(): number;
  setVolume(volume: number): void;
}

interface VideoAdPlayerProps {
  onAdComplete: () => void;
  onAdError: () => void;
  onAdSkipped?: () => void;
  skipAfterSeconds?: number;
  className?: string;
}

const DEFAULT_TEST_AD_TAG = "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_preroll_skippable&sz=640x480&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=";

const getAdTagUrl = () => {
  const customTag = import.meta.env.VITE_AD_TAG_URL;
  return customTag || DEFAULT_TEST_AD_TAG;
};

export function VideoAdPlayer({ 
  onAdComplete, 
  onAdError,
  onAdSkipped,
  skipAfterSeconds = 5,
  className 
}: VideoAdPlayerProps) {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const contentVideoRef = useRef<HTMLVideoElement>(null);
  const adsManagerRef = useRef<AdsManager | null>(null);
  const [adPlaying, setAdPlaying] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [skipCountdown, setSkipCountdown] = useState(skipAfterSeconds);
  const [isMuted, setIsMuted] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImaSDK = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (window.google?.ima) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
      script.async = true;
      script.onload = () => {
        if (window.google?.ima) {
          resolve();
        } else {
          reject(new Error("IMA SDK failed to load"));
        }
      };
      script.onerror = () => reject(new Error("Failed to load IMA SDK"));
      document.head.appendChild(script);
    });
  }, []);

  const initializeAds = useCallback(async () => {
    try {
      await loadImaSDK();
      setSdkLoaded(true);

      if (!adContainerRef.current || !contentVideoRef.current) {
        throw new Error("Ad container not ready");
      }

      const adDisplayContainer = new window.google.ima.AdDisplayContainer(
        adContainerRef.current,
        contentVideoRef.current
      );
      adDisplayContainer.initialize();

      const adsLoader = new window.google.ima.AdsLoader(adDisplayContainer);

      adsLoader.addEventListener(
        window.google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (e: any) => {
          const adsRenderingSettings = new window.google.ima.AdsRenderingSettings();
          adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;

          const manager: AdsManager = e.getAdsManager(contentVideoRef.current, adsRenderingSettings);
          adsManagerRef.current = manager;

          manager.addEventListener(window.google.ima.AdEvent.Type.STARTED, () => {
            setAdPlaying(true);
            setSkipCountdown(skipAfterSeconds);
          });

          manager.addEventListener(window.google.ima.AdEvent.Type.COMPLETE, () => {
            setAdPlaying(false);
            onAdComplete();
          });

          manager.addEventListener(window.google.ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
            setAdPlaying(false);
            onAdComplete();
          });

          manager.addEventListener(window.google.ima.AdEvent.Type.SKIPPED, () => {
            setAdPlaying(false);
            onAdSkipped?.();
            onAdComplete();
          });

          try {
            const width = adContainerRef.current?.clientWidth || 640;
            const height = adContainerRef.current?.clientHeight || 360;
            manager.init(width, height, window.google.ima.ViewMode.NORMAL);
            manager.start();
          } catch (adError) {
            console.error("AdsManager error:", adError);
            onAdError();
          }
        },
        false
      );

      adsLoader.addEventListener(
        window.google.ima.AdErrorEvent.Type.AD_ERROR,
        (e: any) => {
          console.error("Ad error:", e.getError?.()?.getMessage?.() || "Unknown ad error");
          setError("Ad failed to load");
          onAdError();
        },
        false
      );

      const adsRequest = new window.google.ima.AdsRequest();
      adsRequest.adTagUrl = getAdTagUrl();
      adsRequest.linearAdSlotWidth = adContainerRef.current.clientWidth || 640;
      adsRequest.linearAdSlotHeight = adContainerRef.current.clientHeight || 360;
      adsRequest.nonLinearAdSlotWidth = adContainerRef.current.clientWidth || 640;
      adsRequest.nonLinearAdSlotHeight = 150;

      adsLoader.requestAds(adsRequest);
    } catch (err) {
      console.error("Failed to initialize ads:", err);
      setError("Failed to initialize ads");
      onAdError();
    }
  }, [loadImaSDK, onAdComplete, onAdError, onAdSkipped, skipAfterSeconds]);

  useEffect(() => {
    initializeAds();

    return () => {
      if (adsManagerRef.current) {
        adsManagerRef.current.destroy();
        adsManagerRef.current = null;
      }
    };
  }, [initializeAds]);

  useEffect(() => {
    if (!adPlaying || skipCountdown <= 0) return;

    const timer = setInterval(() => {
      setSkipCountdown((prev) => {
        if (prev <= 1) {
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [adPlaying, skipCountdown]);

  const handleSkip = () => {
    if (canSkip && adsManagerRef.current) {
      adsManagerRef.current.skip();
    }
  };

  const toggleMute = () => {
    if (adsManagerRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      adsManagerRef.current.setVolume(newMuted ? 0 : 1);
    }
  };

  if (error) {
    return null;
  }

  return (
    <div className={cn("relative w-full h-full bg-black flex items-center justify-center", className)}>
      <div 
        ref={adContainerRef} 
        className="absolute inset-0 z-10"
      />
      <video 
        ref={contentVideoRef}
        className="w-full h-full"
        playsInline
        muted
      />

      {adPlaying && (
        <>
          <div className="absolute top-4 left-4 z-20 bg-yellow-500 text-black px-3 py-1 rounded-md text-sm font-semibold">
            Ad
          </div>

          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleMute}
              className="bg-black/60 hover:bg-black/80 text-white"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>

            {canSkip ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSkip}
                className="bg-white/90 hover:bg-white text-black font-semibold"
                data-testid="button-skip-ad"
              >
                Skip Ad <X className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <div className="bg-black/60 text-white px-3 py-1.5 rounded-md text-sm">
                Skip in {skipCountdown}s
              </div>
            )}
          </div>
        </>
      )}

      {!sdkLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
            <p className="text-sm">Loading ad...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoAdPlayer;
