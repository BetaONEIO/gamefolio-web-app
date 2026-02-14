import { useEffect, useState } from 'react';

interface VersionData {
  version: string;
  buildTime: string;
  buildHash: string;
}

export function useVersionCheck() {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch('/api/version', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const data: VersionData = await response.json();
        
        const storedHash = localStorage.getItem('app_build_hash');
        
        if (storedHash && storedHash !== data.buildHash) {
          setIsUpdateAvailable(true);
          localStorage.setItem('app_build_hash', data.buildHash);
          
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          window.location.reload();
          return;
        }
        
        if (!storedHash) {
          localStorage.setItem('app_build_hash', data.buildHash);
        }
        
        setCurrentVersion(data.version);
      } catch (error) {
        console.log('Version check failed:', error);
      }
    };

    checkVersion();

    const interval = setInterval(checkVersion, 5 * 60 * 1000);

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
  }, []);

  const forceRefresh = () => {
    localStorage.removeItem('app_build_hash');
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      }).then(() => {
        window.location.reload();
      });
    } else {
      (window as Window).location.reload();
    }
  };

  return {
    currentVersion,
    isUpdateAvailable,
    forceRefresh
  };
}
