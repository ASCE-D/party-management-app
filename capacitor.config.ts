import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.partyapp.party',
  appName: 'Party Management',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useLegacyLayout: false,
    },
    LocalNotifications: {
      smallIcon: "ic_notification",
      iconColor: "#488AFF",
    },
    Filesystem: {
      directories: {
        documents: 'DOCUMENTS',
        data: 'DATA'
      },
    },
    FirebaseMessaging: {
      // FCM configuration - will be handled by google-services.json
    },
  },
};

export default config;