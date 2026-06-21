import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gamefolio.app',
  appName: 'Gamefolio',
  webDir: 'dist/public',
  // Match the WebView background to the app's base navy (--card / body bg).
  // Without this the native WebView background defaults to black, which flashed
  // through as a "random black area" at the top whenever iOS rubber-band
  // overscrolled or applied its content inset.
  backgroundColor: '#0B1218',
  ios: {
    contentInset: 'always',
    backgroundColor: '#0B1218',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0B1218',
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    CapacitorCookies: {
      enabled: true,
    },
    App: {
      launchUrl: 'com.gamefolio.app://',
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#101D27',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      androidScaleType: 'CENTER_CROP',
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
