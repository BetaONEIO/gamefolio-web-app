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
  },
};

export default config;
