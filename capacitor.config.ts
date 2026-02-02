import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.arcadecabinet.homestead_headaches",
  appName: "Homestead Headaches",
  webDir: "dist",
  server: {
    // Enable for development with live reload
    // url: "http://localhost:5173",
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#FCD34D", // Duck yellow
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#FCD34D",
    },
    ScreenOrientation: {
      // Lock to portrait for the stacking game
      // Can be overridden per-platform in native config
    },
    Haptics: {
      // Use defaults
    },
    Preferences: {
      // Group name for iOS keychain sharing if needed
      // group: "com.arcadecabinet.homestead_headaches.shared"
    },
  },
  // Android-specific configuration
  android: {
    allowMixedContent: true,
    backgroundColor: "#FCD34D",
  },
  // iOS-specific configuration  
  ios: {
    backgroundColor: "#FCD34D",
    contentInset: "automatic",
    preferredContentMode: "mobile",
  },
};

export default config;
