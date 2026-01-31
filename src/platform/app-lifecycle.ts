/**
 * Platform App Lifecycle Management
 * Handles pause/resume, back button, state restoration
 */

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

export type AppState = "active" | "inactive" | "background";

export interface AppLifecycleCallbacks {
  onPause?: () => void;
  onResume?: () => void;
  onBackButton?: () => boolean; // Return true to prevent default back behavior
  onStateChange?: (state: AppState) => void;
}

class AppLifecycleManager {
  private callbacks: AppLifecycleCallbacks = {};
  private currentState: AppState = "active";
  private initialized = false;

  /**
   * Initialize lifecycle listeners
   */
  async init(callbacks: AppLifecycleCallbacks = {}): Promise<void> {
    if (this.initialized) return;

    this.callbacks = callbacks;

    if (Capacitor.isNativePlatform()) {
      // Native app state changes
      await App.addListener("appStateChange", ({ isActive }) => {
        const newState: AppState = isActive ? "active" : "background";
        this.handleStateChange(newState);
      });

      // Back button (Android)
      await App.addListener("backButton", ({ canGoBack }) => {
        const handled = this.callbacks.onBackButton?.();
        if (!handled && !canGoBack) {
          // Minimize app instead of closing
          App.minimizeApp();
        }
      });

      // App URL opened (deep linking)
      await App.addListener("appUrlOpen", (data) => {
        console.log("[App] URL opened:", data.url);
        // Handle deep links here
      });
    } else {
      // Web visibility API
      document.addEventListener("visibilitychange", () => {
        const newState: AppState = document.hidden ? "inactive" : "active";
        this.handleStateChange(newState);
      });

      // Web page hide/show (more reliable for mobile browsers)
      window.addEventListener("pagehide", () => {
        this.handleStateChange("background");
      });

      window.addEventListener("pageshow", () => {
        this.handleStateChange("active");
      });
    }

    this.initialized = true;
  }

  /**
   * Handle state changes
   */
  private handleStateChange(newState: AppState): void {
    if (newState === this.currentState) return;

    const previousState = this.currentState;
    this.currentState = newState;

    // Trigger appropriate callbacks
    if (newState === "active" && previousState !== "active") {
      this.callbacks.onResume?.();
    } else if (newState !== "active" && previousState === "active") {
      this.callbacks.onPause?.();
    }

    this.callbacks.onStateChange?.(newState);
    console.log(`[App] State changed: ${previousState} -> ${newState}`);
  }

  /**
   * Get current app state
   */
  getState(): AppState {
    return this.currentState;
  }

  /**
   * Update callbacks
   */
  setCallbacks(callbacks: AppLifecycleCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Exit the app (Android only)
   */
  async exit(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await App.exitApp();
    }
  }

  /**
   * Minimize the app (Android only)
   */
  async minimize(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await App.minimizeApp();
    }
  }

  /**
   * Get app info
   */
  async getInfo(): Promise<{ name: string; id: string; version: string; build: string } | null> {
    if (Capacitor.isNativePlatform()) {
      return await App.getInfo();
    }
    return null;
  }

  /**
   * Clean up listeners
   */
  async dispose(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await App.removeAllListeners();
    }
    this.initialized = false;
  }
}

export const appLifecycle = new AppLifecycleManager();
