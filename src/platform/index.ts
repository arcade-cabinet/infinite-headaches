/**
 * Platform Abstraction Layer
 * Unified API for cross-platform features
 */

import { Capacitor } from "@capacitor/core";

export { haptics } from "./haptics";
export { storage, STORAGE_KEYS } from "./storage";
export { platformAudio } from "./audio";
export { appLifecycle, type AppState, type AppLifecycleCallbacks } from "./app-lifecycle";
export { feedback } from "./feedback";
export {
  inputManager,
  type InputSource,
  type InputDirection,
  type InputState,
  type DragEventData,
} from "./input";
export {
  deviceManager,
  type DeviceInfo,
  type DeviceType,
  type Orientation,
} from "./device";

// Re-export Capacitor utilities
export { Capacitor };

/**
 * Platform detection utilities
 * Uses cached Capacitor import for efficient repeated calls
 */
export const platform = {
  /**
   * Check if running on native platform (iOS/Android)
   */
  isNative: () => Capacitor.isNativePlatform(),

  /**
   * Get current platform
   */
  getPlatform: (): "ios" | "android" | "web" => Capacitor.getPlatform() as "ios" | "android" | "web",

  /**
   * Check if running on iOS
   */
  isIOS: () => Capacitor.getPlatform() === "ios",

  /**
   * Check if running on Android
   */
  isAndroid: () => Capacitor.getPlatform() === "android",

  /**
   * Check if running in web browser
   */
  isWeb: () => Capacitor.getPlatform() === "web",

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
  const { inputManager } = await import("./input");
  const { deviceManager } = await import("./device");

  // Initialize device detection first (other systems may depend on it)
  await deviceManager.init();

  // Initialize audio system
  await platformAudio.init();

  // Initialize input system
  await inputManager.init();

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
