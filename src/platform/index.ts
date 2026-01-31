/**
 * Platform Abstraction Layer
 * Unified API for cross-platform features
 */

export { haptics } from "./haptics";
export { storage, STORAGE_KEYS } from "./storage";
export { platformAudio } from "./audio";
export { appLifecycle, type AppState, type AppLifecycleCallbacks } from "./app-lifecycle";
export { feedback } from "./feedback";

// Re-export Capacitor utilities
export { Capacitor } from "@capacitor/core";

/**
 * Platform detection utilities
 */
export const platform = {
  /**
   * Check if running on native platform (iOS/Android)
   */
  isNative: () => {
    const { Capacitor } = require("@capacitor/core");
    return Capacitor.isNativePlatform();
  },

  /**
   * Get current platform
   */
  getPlatform: (): "ios" | "android" | "web" => {
    const { Capacitor } = require("@capacitor/core");
    return Capacitor.getPlatform() as "ios" | "android" | "web";
  },

  /**
   * Check if running on iOS
   */
  isIOS: () => {
    const { Capacitor } = require("@capacitor/core");
    return Capacitor.getPlatform() === "ios";
  },

  /**
   * Check if running on Android
   */
  isAndroid: () => {
    const { Capacitor } = require("@capacitor/core");
    return Capacitor.getPlatform() === "android";
  },

  /**
   * Check if running in web browser
   */
  isWeb: () => {
    const { Capacitor } = require("@capacitor/core");
    return Capacitor.getPlatform() === "web";
  },

  /**
   * Check if PWA installed
   */
  isPWA: () => {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  },
};

/**
 * Initialize all platform services
 */
export async function initPlatform(): Promise<void> {
  const { platformAudio } = await import("./audio");
  const { appLifecycle } = await import("./app-lifecycle");

  // Initialize audio system
  await platformAudio.init();

  // Initialize app lifecycle with game-specific callbacks
  await appLifecycle.init({
    onPause: () => {
      // Game will handle pause through its own state management
      console.log("[Platform] App paused");
    },
    onResume: () => {
      console.log("[Platform] App resumed");
    },
    onBackButton: () => {
      // Let game handle back button
      return false;
    },
  });

  console.log("[Platform] Initialized");
}
