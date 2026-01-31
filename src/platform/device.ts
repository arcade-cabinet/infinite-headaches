/**
 * Device Detection and Orientation Handling
 * Comprehensive device capability detection using Capacitor
 */

import { Capacitor } from "@capacitor/core";
import { ScreenOrientation } from "@capacitor/screen-orientation";

export type DeviceType = "phone" | "tablet" | "foldable" | "desktop";
export type Orientation = "portrait" | "landscape";

export interface DeviceInfo {
  type: DeviceType;
  platform: "ios" | "android" | "web";
  isNative: boolean;
  isPWA: boolean;
  orientation: Orientation;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  hasTouch: boolean;
  hasKeyboard: boolean;
  hasMouse: boolean;
  isReducedMotion: boolean;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// Device detection thresholds
const DEVICE_THRESHOLDS = {
  // Minimum dimension to be considered tablet
  TABLET_MIN_DIM: 600,
  // Aspect ratio threshold for foldable detection
  FOLDABLE_MAX_ASPECT: 1.2,
  // Minimum dimension for foldable in unfolded state
  FOLDABLE_MIN_DIM: 600,
} as const;

class DeviceManager {
  private deviceInfo: DeviceInfo | null = null;
  private orientationListeners = new Set<(orientation: Orientation) => void>();
  private resizeListeners = new Set<(info: DeviceInfo) => void>();
  private initialized = false;
  private orientationListenerHandle: { remove: () => Promise<void> } | null = null;

  /**
   * Initialize device detection and orientation tracking
   */
  async init(): Promise<DeviceInfo> {
    if (this.deviceInfo && this.initialized) {
      return this.deviceInfo;
    }

    const platform = Capacitor.getPlatform() as "ios" | "android" | "web";
    const isNative = Capacitor.isNativePlatform();

    // Screen dimensions
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    // Detect device type
    const type = this.detectDeviceType(screenWidth, screenHeight, pixelRatio, isNative);

    // Detect current orientation
    const orientation = this.detectOrientation(screenWidth, screenHeight);

    // Input capabilities
    const hasTouch = this.detectTouchCapability();
    const hasMouse = this.detectMouseCapability();
    const hasKeyboard = this.detectKeyboardCapability(hasTouch, hasMouse);

    // Accessibility preferences
    const isReducedMotion = this.detectReducedMotion();

    // Safe area insets (for notches, dynamic island, home indicator, etc.)
    const safeAreaInsets = this.getSafeAreaInsets();

    // PWA detection
    const isPWA = this.detectPWA();

    this.deviceInfo = {
      type,
      platform,
      isNative,
      isPWA,
      orientation,
      screenWidth,
      screenHeight,
      pixelRatio,
      hasTouch,
      hasKeyboard,
      hasMouse,
      isReducedMotion,
      safeAreaInsets,
    };

    // Listen for orientation changes
    await this.setupOrientationListener();

    // Listen for resize events
    this.setupResizeListener();

    // Listen for reduced motion preference changes
    this.setupReducedMotionListener();

    this.initialized = true;
    console.log("[Device] Initialized:", this.deviceInfo);
    return this.deviceInfo;
  }

  /**
   * Detect device type based on screen dimensions and capabilities
   */
  private detectDeviceType(
    width: number,
    height: number,
    _pixelRatio: number,
    isNative: boolean
  ): DeviceType {
    const minDim = Math.min(width, height);
    const maxDim = Math.max(width, height);
    const aspectRatio = maxDim / minDim;

    // For web, check for common desktop indicators
    if (!isNative && typeof window !== "undefined") {
      // Desktop typically has fine pointer (mouse) and no touch
      const hasFinePrimaryPointer = window.matchMedia("(pointer: fine)").matches;
      const hasPrimaryHover = window.matchMedia("(hover: hover)").matches;
      const hasNoTouch = !("ontouchstart" in window) && navigator.maxTouchPoints === 0;

      // If we have mouse, hover, and no touch - likely desktop
      if (hasFinePrimaryPointer && hasPrimaryHover && hasNoTouch && minDim >= 600) {
        return "desktop";
      }
    }

    // Foldable detection - square-ish aspect ratio with large dimensions
    // Common foldables have ~1:1 to ~1.2:1 aspect ratio when unfolded
    if (
      aspectRatio <= DEVICE_THRESHOLDS.FOLDABLE_MAX_ASPECT &&
      minDim >= DEVICE_THRESHOLDS.FOLDABLE_MIN_DIM
    ) {
      return "foldable";
    }

    // Tablet detection - larger minimum dimension
    if (minDim >= DEVICE_THRESHOLDS.TABLET_MIN_DIM) {
      return "tablet";
    }

    // Phone detection - small screens
    if (minDim < DEVICE_THRESHOLDS.TABLET_MIN_DIM) {
      return "phone";
    }

    // Desktop fallback for large screens without touch
    return "desktop";
  }

  /**
   * Detect current screen orientation
   */
  private detectOrientation(width: number, height: number): Orientation {
    // Use Screen Orientation API if available
    if (typeof screen !== "undefined" && screen.orientation) {
      const type = screen.orientation.type;
      if (type.includes("landscape")) return "landscape";
      if (type.includes("portrait")) return "portrait";
    }

    // Fallback to dimension comparison
    return width > height ? "landscape" : "portrait";
  }

  /**
   * Detect touch capability
   */
  private detectTouchCapability(): boolean {
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      // Legacy check for older browsers
      (window.matchMedia?.("(any-pointer: coarse)").matches ?? false)
    );
  }

  /**
   * Detect mouse capability
   */
  private detectMouseCapability(): boolean {
    return window.matchMedia?.("(pointer: fine)").matches ?? false;
  }

  /**
   * Detect keyboard capability
   * Assume keyboard available if mouse is present or on devices without touch
   */
  private detectKeyboardCapability(hasTouch: boolean, hasMouse: boolean): boolean {
    // If we have a mouse, likely have a keyboard
    if (hasMouse) return true;

    // If no touch at all, likely desktop with keyboard
    if (!hasTouch) return true;

    // Touch-only devices might have virtual keyboard but not physical
    // For game purposes, treat touch-only as no keyboard
    return false;
  }

  /**
   * Detect reduced motion preference
   */
  private detectReducedMotion(): boolean {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  /**
   * Detect if running as PWA
   */
  private detectPWA(): boolean {
    // Check display-mode media query (works on most browsers)
    const isStandaloneMediaQuery =
      window.matchMedia?.("(display-mode: standalone)").matches ?? false;

    // Check iOS Safari standalone mode
    const iOSStandalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    // Check Android TWA
    const isAndroidTWA = document.referrer.includes("android-app://");

    return isStandaloneMediaQuery || iOSStandalone || isAndroidTWA;
  }

  /**
   * Get safe area insets from CSS environment variables
   */
  private getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
    const insets = { top: 0, bottom: 0, left: 0, right: 0 };

    if (typeof document === "undefined" || typeof CSS === "undefined") {
      return insets;
    }

    // Check if env() is supported
    if (!CSS.supports?.("padding-top", "env(safe-area-inset-top, 0px)")) {
      return insets;
    }

    // Create a measurement element
    const el = document.createElement("div");
    el.style.cssText = `
      position: fixed;
      visibility: hidden;
      padding-top: env(safe-area-inset-top, 0px);
      padding-bottom: env(safe-area-inset-bottom, 0px);
      padding-left: env(safe-area-inset-left, 0px);
      padding-right: env(safe-area-inset-right, 0px);
    `;

    document.body.appendChild(el);

    try {
      const computed = window.getComputedStyle(el);
      insets.top = Number.parseInt(computed.paddingTop, 10) || 0;
      insets.bottom = Number.parseInt(computed.paddingBottom, 10) || 0;
      insets.left = Number.parseInt(computed.paddingLeft, 10) || 0;
      insets.right = Number.parseInt(computed.paddingRight, 10) || 0;
    } finally {
      document.body.removeChild(el);
    }

    return insets;
  }

  /**
   * Setup orientation change listener using Capacitor on native, screen API on web
   */
  private async setupOrientationListener(): Promise<void> {
    // Use Capacitor Screen Orientation plugin if available on native
    if (Capacitor.isNativePlatform()) {
      try {
        this.orientationListenerHandle = await ScreenOrientation.addListener(
          "screenOrientationChange",
          (info) => {
            const orientation: Orientation = info.type.includes("landscape")
              ? "landscape"
              : "portrait";
            this.updateOrientation(orientation);
          }
        );
        console.log("[Device] Native orientation listener registered");
      } catch (e) {
        console.warn("[Device] Screen orientation plugin not available:", e);
        // Fallback to web API
        this.setupWebOrientationListener();
      }
    } else {
      this.setupWebOrientationListener();
    }
  }

  /**
   * Setup web-based orientation change listener
   */
  private setupWebOrientationListener(): void {
    // Use Screen Orientation API if available
    if (typeof screen !== "undefined" && screen.orientation) {
      screen.orientation.addEventListener("change", () => {
        const orientation = this.detectOrientation(window.innerWidth, window.innerHeight);
        this.updateOrientation(orientation);
      });
    }

    // Also listen for legacy orientationchange event (iOS Safari)
    window.addEventListener("orientationchange", () => {
      // Delay to allow dimensions to update
      setTimeout(() => {
        const orientation = this.detectOrientation(window.innerWidth, window.innerHeight);
        this.updateOrientation(orientation);
      }, 100);
    });
  }

  /**
   * Setup resize listener for dimension changes
   */
  private setupResizeListener(): void {
    // Use ResizeObserver if available for better performance
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        this.handleResize();
      });
      observer.observe(document.documentElement);
    } else {
      // Fallback to window resize event
      window.addEventListener("resize", this.handleResize);
    }
  }

  /**
   * Setup listener for reduced motion preference changes
   */
  private setupReducedMotionListener(): void {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mediaQuery) {
      mediaQuery.addEventListener("change", (e) => {
        if (this.deviceInfo) {
          this.deviceInfo = {
            ...this.deviceInfo,
            isReducedMotion: e.matches,
          };
          console.log("[Device] Reduced motion preference changed:", e.matches);
        }
      });
    }
  }

  /**
   * Handle window resize events
   */
  private handleResize = (): void => {
    if (!this.deviceInfo) return;

    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    const newOrientation = this.detectOrientation(newWidth, newHeight);
    const newType = this.detectDeviceType(
      newWidth,
      newHeight,
      window.devicePixelRatio,
      this.deviceInfo.isNative
    );
    const newSafeAreaInsets = this.getSafeAreaInsets();

    const previousOrientation = this.deviceInfo.orientation;

    this.deviceInfo = {
      ...this.deviceInfo,
      screenWidth: newWidth,
      screenHeight: newHeight,
      orientation: newOrientation,
      type: newType,
      safeAreaInsets: newSafeAreaInsets,
      pixelRatio: window.devicePixelRatio || 1,
    };

    // Notify resize listeners
    for (const cb of this.resizeListeners) {
      cb(this.deviceInfo!);
    }

    // Handle orientation change if changed
    if (newOrientation !== previousOrientation) {
      this.updateOrientation(newOrientation);
    }
  };

  /**
   * Update orientation and notify listeners
   */
  private updateOrientation(orientation: Orientation): void {
    if (this.deviceInfo && this.deviceInfo.orientation !== orientation) {
      this.deviceInfo = {
        ...this.deviceInfo,
        orientation,
      };
      console.log("[Device] Orientation changed:", orientation);
    }
    for (const cb of this.orientationListeners) {
      cb(orientation);
    }
  }

  /**
   * Subscribe to orientation changes
   * @returns Unsubscribe function
   */
  onOrientationChange(callback: (orientation: Orientation) => void): () => void {
    this.orientationListeners.add(callback);
    return () => {
      this.orientationListeners.delete(callback);
    };
  }

  /**
   * Subscribe to resize/dimension changes
   * @returns Unsubscribe function
   */
  onResize(callback: (info: DeviceInfo) => void): () => void {
    this.resizeListeners.add(callback);
    return () => {
      this.resizeListeners.delete(callback);
    };
  }

  /**
   * Get current device info (or null if not initialized)
   */
  getInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  /**
   * Check if device is a phone
   */
  isPhone(): boolean {
    return this.deviceInfo?.type === "phone";
  }

  /**
   * Check if device is a tablet
   */
  isTablet(): boolean {
    return this.deviceInfo?.type === "tablet";
  }

  /**
   * Check if device is a foldable
   */
  isFoldable(): boolean {
    return this.deviceInfo?.type === "foldable";
  }

  /**
   * Check if device is a desktop
   */
  isDesktop(): boolean {
    return this.deviceInfo?.type === "desktop";
  }

  /**
   * Check if device is in landscape orientation
   */
  isLandscape(): boolean {
    return this.deviceInfo?.orientation === "landscape";
  }

  /**
   * Check if device is in portrait orientation
   */
  isPortrait(): boolean {
    return this.deviceInfo?.orientation === "portrait";
  }

  /**
   * Check if device has touch capability
   */
  hasTouch(): boolean {
    return this.deviceInfo?.hasTouch ?? false;
  }

  /**
   * Check if device has mouse capability
   */
  hasMouse(): boolean {
    return this.deviceInfo?.hasMouse ?? false;
  }

  /**
   * Check if device has keyboard capability
   */
  hasKeyboard(): boolean {
    return this.deviceInfo?.hasKeyboard ?? true;
  }

  /**
   * Lock screen orientation (native only)
   * @param orientation - "portrait", "landscape", or "any" (unlocked)
   */
  async lockOrientation(orientation: "portrait" | "landscape" | "any"): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Try web Screen Orientation API
      // Note: lock() is not always typed in TypeScript DOM lib, but is widely supported
      const screenOrientation = screen?.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>;
      };

      if (typeof screen !== "undefined" && screenOrientation?.lock) {
        try {
          if (orientation === "any") {
            screenOrientation.unlock();
          } else {
            // Map to OrientationLockType
            const lockType = orientation === "portrait" ? "portrait" : "landscape";
            await screenOrientation.lock(lockType);
          }
          console.log("[Device] Web orientation locked:", orientation);
        } catch (e) {
          console.warn("[Device] Web orientation lock not supported:", e);
        }
      }
      return;
    }

    try {
      if (orientation === "any") {
        await ScreenOrientation.unlock();
        console.log("[Device] Orientation unlocked");
      } else {
        await ScreenOrientation.lock({
          orientation: orientation === "portrait" ? "portrait" : "landscape",
        });
        console.log("[Device] Orientation locked:", orientation);
      }
    } catch (e) {
      console.warn("[Device] Could not lock orientation:", e);
    }
  }

  /**
   * Get current screen orientation type (more detailed than Orientation)
   */
  async getOrientationType(): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await ScreenOrientation.orientation();
        return result.type;
      } catch (e) {
        console.warn("[Device] Could not get orientation type:", e);
      }
    }

    // Web fallback
    if (typeof screen !== "undefined" && screen.orientation) {
      return screen.orientation.type;
    }

    return null;
  }

  /**
   * Check if device is a mobile device (phone or tablet)
   */
  isMobile(): boolean {
    const type = this.deviceInfo?.type;
    return type === "phone" || type === "tablet" || type === "foldable";
  }

  /**
   * Get optimal game viewport dimensions accounting for safe areas
   */
  getGameViewport(): { width: number; height: number; offsetTop: number; offsetLeft: number } {
    if (!this.deviceInfo) {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        offsetTop: 0,
        offsetLeft: 0,
      };
    }

    const { screenWidth, screenHeight, safeAreaInsets } = this.deviceInfo;

    return {
      width: screenWidth - safeAreaInsets.left - safeAreaInsets.right,
      height: screenHeight - safeAreaInsets.top - safeAreaInsets.bottom,
      offsetTop: safeAreaInsets.top,
      offsetLeft: safeAreaInsets.left,
    };
  }

  /**
   * Clean up listeners
   */
  async dispose(): Promise<void> {
    // Remove Capacitor listener if exists
    if (this.orientationListenerHandle) {
      try {
        await this.orientationListenerHandle.remove();
      } catch (e) {
        console.warn("[Device] Error removing orientation listener:", e);
      }
      this.orientationListenerHandle = null;
    }

    // Clear listener sets
    this.orientationListeners.clear();
    this.resizeListeners.clear();

    // Remove window listener
    window.removeEventListener("resize", this.handleResize);

    this.initialized = false;
    this.deviceInfo = null;
    console.log("[Device] Disposed");
  }
}

export const deviceManager = new DeviceManager();
