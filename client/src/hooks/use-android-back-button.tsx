import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { isAndroid } from '@/lib/platform';

export function useAndroidBackButton(): void {
  useEffect(() => {
    if (!isAndroid) return;

    const subscription = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    return () => {
      void subscription.then((handle) => handle.remove());
    };
  }, []);
}
