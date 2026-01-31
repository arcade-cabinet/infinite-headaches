/**
 * Graphics Hooks
 * React hooks for accessing and controlling graphics settings
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type {
  GraphicsSettings,
  GraphicsSettingsUpdate,
  QualityLevel,
  PerformanceMetrics,
} from "../settings/types";
import { graphicsManager } from "../manager/GraphicsManager";
import { useGraphicsContext } from "../context/GraphicsContext";

/**
 * Main hook for accessing graphics settings and controls
 * Provides the full context value with settings and update functions
 *
 * @example
 * ```tsx
 * function SettingsPanel() {
 *   const { settings, setQuality, toggleSetting, isLoading } = useGraphics();
 *
 *   return (
 *     <div>
 *       <select
 *         value={settings.quality}
 *         onChange={(e) => setQuality(e.target.value as QualityLevel)}
 *         disabled={isLoading}
 *       >
 *         <option value="low">Low</option>
 *         <option value="medium">Medium</option>
 *         <option value="high">High</option>
 *       </select>
 *
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={settings.shadowsEnabled}
 *           onChange={() => toggleSetting('shadowsEnabled')}
 *           disabled={isLoading}
 *         />
 *         Shadows
 *       </label>
 *     </div>
 *   );
 * }
 * ```
 */
export function useGraphics() {
  return useGraphicsContext();
}

/**
 * Hook to get just the current settings (read-only)
 * Lighter weight than useGraphics when you don't need update functions
 *
 * @example
 * ```tsx
 * function ParticleSystem() {
 *   const settings = useGraphicsSettings();
 *
 *   return (
 *     <ParticleEmitter
 *       count={settings.particleCount * 1000}
 *       enabled={settings.particlesEnabled}
 *     />
 *   );
 * }
 * ```
 */
export function useGraphicsSettings(): GraphicsSettings {
  const { settings } = useGraphicsContext();
  return settings;
}

/**
 * Hook to get current quality level
 *
 * @example
 * ```tsx
 * function QualityBadge() {
 *   const quality = useQualityLevel();
 *   return <span className={`quality-${quality}`}>{quality.toUpperCase()}</span>;
 * }
 * ```
 */
export function useQualityLevel(): QualityLevel {
  const { settings } = useGraphicsContext();
  return settings.quality;
}

/**
 * Hook to check if a specific setting is enabled
 *
 * @example
 * ```tsx
 * function ShadowLayer() {
 *   const shadowsEnabled = useGraphicsSetting('shadowsEnabled');
 *   if (!shadowsEnabled) return null;
 *   return <ShadowRenderer />;
 * }
 * ```
 */
export function useGraphicsSetting<K extends keyof GraphicsSettings>(
  key: K
): GraphicsSettings[K] {
  const { settings } = useGraphicsContext();
  return settings[key];
}

/**
 * Hook for settings that affect rendering performance
 * Returns a memoized object with common rendering-related settings
 *
 * @example
 * ```tsx
 * function GameRenderer() {
 *   const {
 *     shadowsEnabled,
 *     antialiasing,
 *     particleCount,
 *     glowLayerEnabled,
 *   } = useRenderSettings();
 *
 *   // Use settings to configure renderer
 * }
 * ```
 */
export function useRenderSettings() {
  const { settings } = useGraphicsContext();

  return useMemo(
    () => ({
      shadowsEnabled: settings.shadowsEnabled,
      shadowMapSize: settings.shadowMapSize,
      particleCount: settings.particleCount,
      reflectionsEnabled: settings.reflectionsEnabled,
      antialiasing: settings.antialiasing,
      postProcessingEnabled: settings.postProcessingEnabled,
      glowLayerEnabled: settings.glowLayerEnabled,
      textureQuality: settings.textureQuality,
      hardwareScalingLevel: settings.hardwareScalingLevel,
    }),
    [
      settings.shadowsEnabled,
      settings.shadowMapSize,
      settings.particleCount,
      settings.reflectionsEnabled,
      settings.antialiasing,
      settings.postProcessingEnabled,
      settings.glowLayerEnabled,
      settings.textureQuality,
      settings.hardwareScalingLevel,
    ]
  );
}

/**
 * Hook for accessibility-related settings
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const { reducedMotion, reduceFlashing } = useAccessibilitySettings();
 *
 *   return (
 *     <motion.div
 *       animate={{ opacity: reduceFlashing ? 1 : [0, 1, 0, 1] }}
 *       transition={{ duration: reducedMotion ? 0 : 0.3 }}
 *     />
 *   );
 * }
 * ```
 */
export function useAccessibilitySettings() {
  const { settings } = useGraphicsContext();

  return useMemo(
    () => ({
      reducedMotion: settings.reducedMotion,
      reduceFlashing: settings.reduceFlashing,
      screenShake: settings.screenShake && !settings.reducedMotion,
      motionBlur: settings.motionBlur && !settings.reducedMotion,
    }),
    [settings.reducedMotion, settings.reduceFlashing, settings.screenShake, settings.motionBlur]
  );
}

/**
 * Hook for checking if user prefers reduced motion
 * Takes system preference into account
 *
 * @example
 * ```tsx
 * function Transition({ children }) {
 *   const reducedMotion = useReducedMotion();
 *   return (
 *     <AnimatePresence>
 *       {reducedMotion ? children : <motion.div>{children}</motion.div>}
 *     </AnimatePresence>
 *   );
 * }
 * ```
 */
export function useReducedMotion(): boolean {
  const { settings } = useGraphicsContext();
  return settings.reducedMotion;
}

/**
 * Hook for performance monitoring
 * Returns current FPS and performance metrics when adaptive quality is enabled
 *
 * @example
 * ```tsx
 * function PerformanceOverlay() {
 *   const { fps, isMonitoring } = usePerformanceMonitor();
 *
 *   if (!isMonitoring) return null;
 *
 *   return (
 *     <div className="fps-counter">
 *       FPS: {fps?.toFixed(0) ?? '--'}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePerformanceMonitor() {
  const { performanceMetrics, settings } = useGraphicsContext();

  return useMemo(
    () => ({
      fps: performanceMetrics?.fps ?? null,
      frameTimeMs: performanceMetrics?.frameTimeMs ?? null,
      drawCalls: performanceMetrics?.drawCalls ?? null,
      activeParticles: performanceMetrics?.activeParticles ?? null,
      isMonitoring: settings.adaptiveQuality,
      metrics: performanceMetrics,
    }),
    [performanceMetrics, settings.adaptiveQuality]
  );
}

/**
 * Hook that returns whether screen shake should be applied
 * Considers both the setting and reduced motion preference
 */
export function useScreenShakeEnabled(): boolean {
  const { settings } = useGraphicsContext();
  return settings.screenShake && !settings.reducedMotion;
}

/**
 * Hook that returns whether motion blur should be applied
 * Considers both the setting and reduced motion preference
 */
export function useMotionBlurEnabled(): boolean {
  const { settings } = useGraphicsContext();
  return settings.motionBlur && !settings.reducedMotion;
}

/**
 * Hook that returns whether particles should be rendered
 * Considers both the setting and particle count multiplier
 */
export function useParticlesEnabled(): boolean {
  const { settings } = useGraphicsContext();
  return settings.particlesEnabled && settings.particleCount > 0;
}

/**
 * Hook for getting particle count multiplier
 * Returns 0 if particles are disabled
 */
export function useParticleMultiplier(): number {
  const { settings } = useGraphicsContext();
  return settings.particlesEnabled ? settings.particleCount : 0;
}

/**
 * Hook for target FPS
 * Useful for frame rate limiting logic
 */
export function useTargetFPS(): 30 | 60 {
  const { settings } = useGraphicsContext();
  return settings.targetFPS;
}

/**
 * Alternative hook using useSyncExternalStore for better React 18 concurrent mode support
 * Subscribes directly to graphics manager outside of context
 *
 * This is useful when you need settings but are outside the GraphicsProvider,
 * or want more direct subscription to the manager
 */
export function useGraphicsManagerSettings(): GraphicsSettings | null {
  const subscribe = useCallback((callback: () => void) => {
    return graphicsManager.onChange(callback);
  }, []);

  const getSnapshot = useCallback(() => {
    return graphicsManager.getSettings();
  }, []);

  const getServerSnapshot = useCallback(() => {
    return null;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
