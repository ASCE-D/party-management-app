import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.yourcompany.partyapp",
  appName: "Party Management",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    Camera: {
      permissions: ["camera", "photos"],
    },
    CapacitorSQLite: {
      iosDatabaseLocation: "default",
      androidDatabaseLocation: "default",
    },
    Filesystem: {
      // Configure secure storage
      iosPaths: {
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