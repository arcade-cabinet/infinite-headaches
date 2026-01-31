/**
 * Graphics Module
 * Centralized graphics settings management for Babylon.js + React
 *
 * @module graphics
 *
 * @example
 * ```tsx
 * // In your app entry point
 * import { GraphicsProvider } from './graphics';
 *
 * function App() {
 *   return (
 *     <GraphicsProvider>
 *       <Game />
 *     </GraphicsProvider>
 *   );
 * }
 *
 * // In a component
 * import { useGraphics, useGraphicsSettings, useReducedMotion } from './graphics';
 *
 * function SettingsMenu() {
 *   const { settings, setQuality, toggleSetting, isLoading } = useGraphics();
 *   // ...
 * }
 *
 * function GameRenderer() {
 *   const settings = useGraphicsSettings();
 *   const reducedMotion = useReducedMotion();
 *   // ...
 * }
 * ```
 */

// Types
export type {
  QualityLevel,
  ShadowMapSize,
  TargetFPS,
  GraphicsSettings,
  GraphicsSettingsUpdate,
  GraphicsSettingsChangeEvent,
  GraphicsSettingsListener,
  PerformanceMetrics,
  AdaptiveQualityConfig,
  DeviceCapabilities,
} from "./settings/types";

// Presets
export {
  LOW_PRESET,
  MEDIUM_PRESET,
  HIGH_PRESET,
  QUALITY_PRESETS,
  getPreset,
  getPresetWithAccessibility,
  DEFAULT_ADAPTIVE_CONFIG,
  QUALITY_ORDER,
  getLowerQuality,
  getHigherQuality,
  mergeWithPreset,
} from "./settings/presets";

// Storage
export {
  loadSettings,
  saveSettings,
  updateSettings as updateStoredSettings,
  clearSettings,
  hasStoredSettings,
  getSettingsTimestamp,
} from "./settings/storage";

// Manager
export { graphicsManager, GraphicsManagerImpl } from "./manager/GraphicsManager";

// Context
export {
  GraphicsProvider,
  GraphicsContext,
  useGraphicsContext,
  type GraphicsProviderProps,
  type GraphicsContextValue,
} from "./context/GraphicsContext";

// Hooks
export {
  useGraphics,
  useGraphicsSettings,
  useQualityLevel,
  useGraphicsSetting,
  useRenderSettings,
  useAccessibilitySettings,
  useReducedMotion,
  usePerformanceMonitor,
  useScreenShakeEnabled,
  useMotionBlurEnabled,
  useParticlesEnabled,
  useParticleMultiplier,
  useTargetFPS,
  useGraphicsManagerSettings,
} from "./hooks/useGraphics";
