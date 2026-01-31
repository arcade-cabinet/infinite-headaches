/**
 * useResponsiveScale Hook
 * Calculates responsive scaling factors for different screen sizes
 */

import { useEffect, useMemo, useState } from "react";

export interface ResponsiveScales {
  // Base scale factor (1 = baseline)
  base: number;
  // UI scale for buttons, text, etc.
  ui: number;
  // Game scale for duck size, physics, etc.
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
  // Is mobile device
  isMobile: boolean;
  // Is tablet
  isTablet: boolean;
  // Is foldable (very wide mobile)
  isFoldable: boolean;
  // Screen dimensions
  width: number;
  height: number;
  // Aspect ratio
  aspectRatio: number;
  // Safe area insets (for notches, etc.)
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// Breakpoints
const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

export function useResponsiveScale(): ResponsiveScales {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    // Also listen for orientation change on mobile
    window.addEventListener("orientationchange", () => {
      setTimeout(handleResize, 100);
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  const scales = useMemo(() => {
    const { width, height } = dimensions;
    const aspectRatio = width / height;
    const minDim = Math.min(width, height);
    const _maxDim = Math.max(width, height);

    // Device detection
    const isMobile = width < BREAKPOINTS.tablet;
    const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
    const isFoldable = isMobile && aspectRatio > 1.8;

    // Base scale calculation
    // Reference: 375px width (iPhone SE) = 1.0
    // Scale up/down from there
    const baseScale = Math.max(0.6, Math.min(1.5, minDim / 400));

    // UI scale - slightly more aggressive for readability
    const uiScale = Math.max(0.7, Math.min(1.4, width / 500));

    // Game scale - based on smallest dimension for playability
    const gameScale = Math.max(0.5, Math.min(1.3, minDim / 450));

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

    // Safe area insets (CSS env() fallback)
    const safeArea = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    };

    // Try to read CSS env variables for safe areas
    if (typeof window !== "undefined" && window.CSS?.supports) {
      const testEl = document.createElement("div");
      testEl.style.paddingTop = "env(safe-area-inset-top, 0px)";
      document.body.appendChild(testEl);
      const computed = window.getComputedStyle(testEl);
      safeArea.top = parseInt(computed.paddingTop, 10) || 0;
      document.body.removeChild(testEl);
    }

    return {
      base: baseScale,
      ui: uiScale,
      game: gameScale,
      fontSize,
      spacing,
      isMobile,
      isTablet,
      isFoldable,
      width,
      height,
      aspectRatio,
      safeArea,
    };
  }, [dimensions]);

  return scales;
}

/**
 * Get responsive animal dimensions
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
 * Get responsive physics values
 */
export function getResponsivePhysics(gameScale: number) {
  return {
    gravity: Math.round(20 * gameScale),
    spawnOffset: Math.round(300 * gameScale),
  };
}
