/**
 * useResponsiveScale Hook
 * Calculates responsive scaling factors for different screen sizes
 * Integrates with deviceManager for accurate device type detection
 */

import { useEffect, useMemo, useState } from "react";
import { type DeviceInfo, deviceManager, type Orientation } from "../../platform/device";

export interface ResponsiveScales {
  // Base scale factor (1 = baseline)
  base: number;
  // UI scale for buttons, text, etc.
  ui: number;
  // Game scale for animal size, physics, etc.
  game: number;
  // Font sizes
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    title: string;
  };
  // Spacing
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  // Is mobile device (phone)
  isMobile: boolean;
  // Is tablet
  isTablet: boolean;
  // Is foldable device
  isFoldable: boolean;
  // Is desktop
  isDesktop: boolean;
  // Screen dimensions
  width: number;
  height: number;
  // Aspect ratio
  aspectRatio: number;
  // Current orientation
  orientation: Orientation;
  // Safe area insets (for notches, etc.)
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  // Game viewport (accounting for safe areas)
  gameViewport: {
    width: number;
    height: number;
    offsetTop: number;
    offsetLeft: number;
  };
  // Device pixel ratio
  pixelRatio: number;
  // Has touch capability
  hasTouch: boolean;
  // Prefers reduced motion
  isReducedMotion: boolean;
}

// Breakpoints (used as fallback when device manager not available)
const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

// Default safe area
const DEFAULT_SAFE_AREA = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * Calculate scales based on dimensions and device info
 */
function calculateScales(
  width: number,
  height: number,
  deviceInfo: DeviceInfo | null
): ResponsiveScales {
  const aspectRatio = width / height;
  const minDim = Math.min(width, height);
  const pixelRatio = deviceInfo?.pixelRatio ?? window.devicePixelRatio ?? 1;

  // Get device type from device manager or fallback to dimension-based detection
  let isMobile: boolean;
  let isTablet: boolean;
  let isFoldable: boolean;
  let isDesktop: boolean;
  let orientation: Orientation;
  let safeArea: { top: number; bottom: number; left: number; right: number };

  if (deviceInfo) {
    // Use device manager's accurate detection
    isMobile = deviceInfo.type === "phone";
    isTablet = deviceInfo.type === "tablet";
    isFoldable = deviceInfo.type === "foldable";
    isDesktop = deviceInfo.type === "desktop";
    orientation = deviceInfo.orientation;
    safeArea = deviceInfo.safeAreaInsets;
  } else {
    // Fallback to dimension-based detection
    isMobile = width < BREAKPOINTS.tablet;
    isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
    isFoldable = isMobile && aspectRatio > 1.8;
    isDesktop = width >= BREAKPOINTS.desktop;
    orientation = width > height ? "landscape" : "portrait";
    safeArea = DEFAULT_SAFE_AREA;
  }

  // Calculate game viewport accounting for safe areas
  const gameViewport = {
    width: width - safeArea.left - safeArea.right,
    height: height - safeArea.top - safeArea.bottom,
    offsetTop: safeArea.top,
    offsetLeft: safeArea.left,
  };

  // Base scale calculation
  // Reference: 375px width (iPhone SE) = 1.0
  // Scale up/down from there, with device-type-specific adjustments
  let baseScale = Math.max(0.6, Math.min(1.5, minDim / 400));

  // Apply device-specific adjustments
  if (isTablet) {
    // Tablets can handle slightly larger UI
    baseScale *= 1.1;
  } else if (isFoldable) {
    // Foldables in unfolded state need consideration for unique aspect ratios
    baseScale *= 1.05;
  } else if (isDesktop) {
    // Desktop can have larger UI elements
    baseScale = Math.min(baseScale * 1.2, 1.5);
  }

  // UI scale - slightly more aggressive for readability
  let uiScale = Math.max(0.7, Math.min(1.4, width / 500));

  // Adjust UI scale for device types
  if (isDesktop) {
    uiScale = Math.min(uiScale * 1.1, 1.4);
  }

  // Game scale - based on smallest dimension for playability
  // Account for orientation on mobile devices
  let gameScale = Math.max(0.5, Math.min(1.3, minDim / 450));

  // Landscape mobile needs smaller game elements to fit
  if (isMobile && orientation === "landscape") {
    gameScale *= 0.85;
  }

  // Calculate font sizes
  const baseFontSize = Math.max(12, Math.min(18, minDim / 28));
  const fontSize = {
    xs: `${baseFontSize * 0.75}px`,
    sm: `${baseFontSize * 0.875}px`,
    md: `${baseFontSize}px`,
    lg: `${baseFontSize * 1.25}px`,
    xl: `${baseFontSize * 1.5}px`,
    title: `${Math.max(28, Math.min(64, minDim / 8))}px`,
  };

  // Calculate spacing
  const baseSpacing = Math.max(4, Math.min(16, minDim / 60));
  const spacing = {
    xs: `${baseSpacing * 0.5}px`,
    sm: `${baseSpacing}px`,
    md: `${baseSpacing * 1.5}px`,
    lg: `${baseSpacing * 2}px`,
    xl: `${baseSpacing * 3}px`,
  };

  return {
    base: baseScale,
    ui: uiScale,
    game: gameScale,
    fontSize,
    spacing,
    isMobile,
    isTablet,
    isFoldable,
    isDesktop,
    width,
    height,
    aspectRatio,
    orientation,
    safeArea,
    gameViewport,
    pixelRatio,
    hasTouch: deviceInfo?.hasTouch ?? ("ontouchstart" in window || navigator.maxTouchPoints > 0),
    isReducedMotion: deviceInfo?.isReducedMotion ?? false,
  };
}

export function useResponsiveScale(): ResponsiveScales {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  });
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  // Initialize device manager and subscribe to changes
  useEffect(() => {
    let mounted = true;

    // Initialize device manager
    deviceManager.init().then((info) => {
      if (mounted) {
        setDeviceInfo(info);
        setDimensions({
          width: info.screenWidth,
          height: info.screenHeight,
        });
      }
    });

    // Subscribe to resize/orientation changes from device manager
    const unsubResize = deviceManager.onResize((info) => {
      if (mounted) {
        setDeviceInfo(info);
        setDimensions({
          width: info.screenWidth,
          height: info.screenHeight,
        });
      }
    });

    // Subscribe to orientation changes
    const unsubOrientation = deviceManager.onOrientationChange(() => {
      if (mounted) {
        const info = deviceManager.getInfo();
        if (info) {
          setDeviceInfo(info);
          setDimensions({
            width: info.screenWidth,
            height: info.screenHeight,
          });
        }
      }
    });

    return () => {
      mounted = false;
      unsubResize();
      unsubOrientation();
    };
  }, []);

  // Fallback resize listener for initial load before device manager is ready
  useEffect(() => {
    if (deviceInfo) return; // Device manager is handling resizes

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", () => {
      setTimeout(handleResize, 100);
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [deviceInfo]);

  const scales = useMemo(() => {
    return calculateScales(dimensions.width, dimensions.height, deviceInfo);
  }, [dimensions, deviceInfo]);

  return scales;
}

/**
 * Get responsive animal dimensions based on game scale
 */
export function getResponsiveAnimalSize(gameScale: number) {
  const baseWidth = 80;
  const baseHeight = 70;

  return {
    width: Math.round(baseWidth * gameScale),
    height: Math.round(baseHeight * gameScale),
  };
}

/**
 * Get responsive physics values based on game scale
 */
export function getResponsivePhysics(gameScale: number) {
  return {
    gravity: Math.round(20 * gameScale),
    spawnOffset: Math.round(300 * gameScale),
  };
}

/**
 * Get responsive touch target size based on device type
 * Follows accessibility guidelines (minimum 44x44 on iOS, 48x48 on Android)
 */
export function getResponsiveTouchTargetSize(deviceInfo: DeviceInfo | null): {
  minWidth: number;
  minHeight: number;
} {
  if (!deviceInfo) {
    return { minWidth: 44, minHeight: 44 };
  }

  // Android guidelines recommend 48dp minimum
  if (deviceInfo.platform === "android") {
    return { minWidth: 48, minHeight: 48 };
  }

  // iOS guidelines recommend 44pt minimum
  return { minWidth: 44, minHeight: 44 };
}

/**
 * Calculate optimal canvas resolution based on device capabilities
 */
export function getOptimalCanvasResolution(
  containerWidth: number,
  containerHeight: number,
  deviceInfo: DeviceInfo | null
): { width: number; height: number; scale: number } {
  const pixelRatio = deviceInfo?.pixelRatio ?? window.devicePixelRatio ?? 1;

  // Limit pixel ratio on mobile to save memory/battery
  let effectivePixelRatio = pixelRatio;
  if (deviceInfo?.type === "phone") {
    effectivePixelRatio = Math.min(pixelRatio, 2);
  } else if (deviceInfo?.type === "tablet") {
    effectivePixelRatio = Math.min(pixelRatio, 2.5);
  }

  // For reduced motion users, use lower resolution to improve performance
  if (deviceInfo?.isReducedMotion) {
    effectivePixelRatio = Math.min(effectivePixelRatio, 1.5);
  }

  return {
    width: Math.round(containerWidth * effectivePixelRatio),
    height: Math.round(containerHeight * effectivePixelRatio),
    scale: effectivePixelRatio,
  };
}
