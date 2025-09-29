import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface VersionData {
  version: string;
  buildTime: string;
}

export function useVersionCheck() {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Get current version from package.json via meta endpoint
    const checkVersion = async () => {
      try {
        const response = await fetch('/api/version');
        const data: VersionData = await response.json();
        
        const storedVersion = localStorage.getItem('app_version');
        
        if (storedVersion && storedVersion !== data.version) {
          setIsUpdateAvailable(true);
          showUpdateNotification();
        }
        
        setCurrentVersion(data.version);
        localStorage.setItem('app_version', data.version);
      } catch (error) {
        console.log('Version check failed:', error);
      }
    };

    const showUpdateNotification = () => {
      toast({
        title: "New Update Available",
        description: "A new version of Gamefolio is available. Refresh to get the latest features!",
        duration: 10000,
      });
    };

    checkVersion();

    // Check for updates every 30 minutes
    const interval = setInterval(checkVersion, 30 * 60 * 1000);

    // Check when user returns to tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [toast]);

  const forceRefresh = () => {
    // Clear all caches and force reload
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      }).then(() => {
        window.location.reload();
      });
    } else {
      (window as any).location.reload();
    }
  };

  return {
    currentVersion,
    isUpdateAvailable,
    forceRefresh
  };
}