import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gamefolio.app',
  appName: 'Gamefolio',
  webDir: 'dist/public',
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  plugins: {
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
