/**
 * useDevice Hook
 * React hook for device detection and orientation
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { type DeviceInfo, deviceManager, type Orientation } from "../platform/device";

/**
 * Device hook return type
 */
export interface UseDeviceReturn {
  /** Full device information object */
  deviceInfo: DeviceInfo | null;
  /** Current orientation (portrait/landscape) */
  orientation: Orientation;
  /** Whether device is a phone */
  isPhone: boolean;
  /** Whether device is a tablet */
  isTablet: boolean;
  /** Whether device is a foldable device */
  isFoldable: boolean;
  /** Whether device is a desktop */
  isDesktop: boolean;
  /** Whether device is in landscape orientation */
  isLandscape: boolean;
  /** Whether device is in portrait orientation */
  isPortrait: boolean;
  /** Whether device has touch capability */
  hasTouch: boolean;
  /** Whether device has physical keyboard */
  hasKeyboard: boolean;
  /** Whether device has mouse/trackpad */
  hasMouse: boolean;
  /** Whether running on native platform (iOS/Android via Capacitor) */
  isNative: boolean;
  /** Whether running as PWA */
  isPWA: boolean;
  /** Whether user prefers reduced motion */
  isReducedMotion: boolean;
  /** Safe area insets for notches, home indicators, etc. */
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  /** Screen dimensions */
  screenWidth: number;
  screenHeight: number;
  /** Device pixel ratio */
  pixelRatio: number;
  /** Whether device is mobile (phone, tablet, or foldable) */
  isMobile: boolean;
  /** Lock screen orientation (native only) */
  lockOrientation: (orientation: "portrait" | "landscape" | "any") => Promise<void>;
  /** Get game viewport accounting for safe areas */
  getGameViewport: () => {
    width: number;
    height: number;
    offsetTop: number;
    offsetLeft: number;
  };
}

// Default values for SSR or before initialization
const DEFAULT_SAFE_AREA = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * React hook for comprehensive device detection and orientation handling.
 *
 * Provides reactive access to device information including:
 * - Device type (phone/tablet/foldable/desktop)
 * - Orientation (portrait/landscape)
 * - Input capabilities (touch/mouse/keyboard)
 * - Safe area insets
 * - Platform detection (native/web/PWA)
 *
 * @example
 * ```tsx
 * function GameUI() {
 *   const { isPhone, isLandscape, safeAreaInsets } = useDevice();
 *
 *   return (
 *     <div style={{ paddingTop: safeAreaInsets.top }}>
 *       {isPhone && isLandscape ? <CompactUI /> : <FullUI />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDevice(): UseDeviceReturn {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize device manager on mount
  useEffect(() => {
    let mounted = true;

    const initDevice = async () => {
      try {
        const info = await deviceManager.init();
        if (mounted) {
          setDeviceInfo(info);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("[useDevice] Failed to initialize:", error);
        if (mounted) {
          setIsInitialized(true);
        }
      }
    };

    initDevice();

    return () => {
      mounted = false;
    };
  }, []);

  // Subscribe to orientation changes
  useEffect(() => {
    if (!isInitialized) return;

    const unsubOrientation = deviceManager.onOrientationChange(() => {
      // Get fresh info after orientation change
      const info = deviceManager.getInfo();
      if (info) {
        setDeviceInfo({ ...info });
      }
    });

    return unsubOrientation;
  }, [isInitialized]);

  // Subscribe to resize changes
  useEffect(() => {
    if (!isInitialized) return;

    const unsubResize = deviceManager.onResize((info) => {
      setDeviceInfo({ ...info });
    });

    return unsubResize;
  }, [isInitialized]);

  // Memoized lock orientation function
  const lockOrientation = useCallback(async (orientation: "portrait" | "landscape" | "any") => {
    await deviceManager.lockOrientation(orientation);
  }, []);

  // Memoized get game viewport function
  const getGameViewport = useCallback(() => {
    return deviceManager.getGameViewport();
  }, []);

  // Derive computed values
  const orientation = deviceInfo?.orientation ?? "portrait";
  const type = deviceInfo?.type ?? "phone";
  const safeAreaInsets = deviceInfo?.safeAreaInsets ?? DEFAULT_SAFE_AREA;

  return {
    deviceInfo,
    orientation,
    isPhone: type === "phone",
    isTablet: type === "tablet",
    isFoldable: type === "foldable",
    isDesktop: type === "desktop",
    isLandscape: orientation === "landscape",
    isPortrait: orientation === "portrait",
    hasTouch: deviceInfo?.hasTouch ?? false,
    hasKeyboard: deviceInfo?.hasKeyboard ?? true,
    hasMouse: deviceInfo?.hasMouse ?? false,
    isNative: deviceInfo?.isNative ?? false,
    isPWA: deviceInfo?.isPWA ?? false,
    isReducedMotion: deviceInfo?.isReducedMotion ?? false,
    safeAreaInsets,
    screenWidth:
      deviceInfo?.screenWidth ?? (typeof window !== "undefined" ? window.innerWidth : 1024),
    screenHeight:
      deviceInfo?.screenHeight ?? (typeof window !== "undefined" ? window.innerHeight : 768),
    pixelRatio: deviceInfo?.pixelRatio ?? 1,
    isMobile: type === "phone" || type === "tablet" || type === "foldable",
    lockOrientation,
    getGameViewport,
  };
}

/**
 * Lightweight hook for orientation-only tracking.
 * Use this when you only need orientation and want minimal re-renders.
 *
 * @example
 * ```tsx
 * function OrientationIndicator() {
 *   const orientation = useOrientation();
 *   return <span>{orientation}</span>;
 * }
 * ```
 */
export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>("portrait");

  useEffect(() => {
    // Initialize
    deviceManager.init().then((info) => {
      setOrientation(info.orientation);
    });

    // Subscribe to changes
    const unsub = deviceManager.onOrientationChange(setOrientation);
    return unsub;
  }, []);

  return orientation;
}

/**
 * Hook that returns safe area insets and updates on changes.
 * Useful for components that need to account for notches/home indicators.
 *
 * @example
 * ```tsx
 * function SafeContainer({ children }) {
 *   const insets = useSafeAreaInsets();
 *   return (
 *     <div style={{
 *       paddingTop: insets.top,
 *       paddingBottom: insets.bottom,
 *       paddingLeft: insets.left,
 *       paddingRight: insets.right,
 *     }}>
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const [insets, setInsets] = useState(DEFAULT_SAFE_AREA);

  useEffect(() => {
    deviceManager.init().then((info) => {
      setInsets(info.safeAreaInsets);
    });

    const unsub = deviceManager.onResize((info) => {
      setInsets(info.safeAreaInsets);
    });

    return unsub;
  }, []);

  return insets;
}

/**
 * Hook that returns true if the device is a mobile device (phone, tablet, or foldable).
 * This is a more semantic alternative to checking individual device types.
 *
 * @example
 * ```tsx
 * function ResponsiveLayout() {
 *   const isMobile = useIsMobileDevice();
 *   return isMobile ? <MobileLayout /> : <DesktopLayout />;
 * }
 * ```
 */
export function useIsMobileDevice(): boolean {
  const { isMobile } = useDevice();
  return isMobile;
}

/**
 * Hook for using useSyncExternalStore with device manager.
 * More efficient for simple subscriptions with concurrent mode.
 */
function getDeviceSnapshot(): DeviceInfo | null {
  return deviceManager.getInfo();
}

function getDeviceServerSnapshot(): DeviceInfo | null {
  return null;
}

function subscribeToDevice(callback: () => void): () => void {
  // Initialize if needed and subscribe
  deviceManager.init().then(() => callback());

  const unsubOrientation = deviceManager.onOrientationChange(() => callback());
  const unsubResize = deviceManager.onResize(() => callback());

  return () => {
    unsubOrientation();
    unsubResize();
  };
}

/**
 * Alternative hook using useSyncExternalStore for better React 18 concurrent mode support.
 * Provides the raw DeviceInfo object.
 *
 * @example
 * ```tsx
 * function DeviceDisplay() {
 *   const info = useDeviceInfo();
 *   if (!info) return <LoadingSpinner />;
 *   return <div>Device type: {info.type}</div>;
 * }
 * ```
 */
export function useDeviceInfo(): DeviceInfo | null {
  return useSyncExternalStore(subscribeToDevice, getDeviceSnapshot, getDeviceServerSnapshot);
}
