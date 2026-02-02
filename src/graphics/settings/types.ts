/**
 * Graphics Settings Type Definitions
 * TypeScript interfaces for the graphics settings system
 */

/**
 * Quality level presets
 */
export type QualityLevel = "low" | "medium" | "high";

/**
 * Shadow map resolution options
 */
export type ShadowMapSize = 512 | 1024 | 2048;

/**
 * Target framerate options
 */
export type TargetFPS = 30 | 60;

/**
 * Complete graphics settings configuration
 */
export interface GraphicsSettings {
  /** Selected quality preset */
  quality: QualityLevel;

  // Babylon.js Engine Settings
  /** Enable shadow rendering */
  shadowsEnabled: boolean;
  /** Shadow map resolution (higher = better quality, more GPU) */
  shadowMapSize: ShadowMapSize;
  /** Maximum particle count multiplier (0.0-1.0) */
  particleCount: number;
  /** Enable reflections and environment mapping */
  reflectionsEnabled: boolean;
  /** Enable MSAA antialiasing */
  antialiasing: boolean;
  /** Enable post-processing effects */
  postProcessingEnabled: boolean;
  /** Enable glow/bloom layer effects */
  glowLayerEnabled: boolean;
  /** Texture quality scale (0.5 = half res, 1.0 = full res) */
  textureQuality: number;

  // Canvas 2D Settings (for hybrid rendering)
  /** Enable motion blur effect on 2D canvas */
  motionBlur: boolean;
  /** Enable screen shake camera effects */
  screenShake: boolean;
  /** Enable 2D particle effects */
  particlesEnabled: boolean;

  // Performance Settings
  /** Target framerate */
  targetFPS: TargetFPS;
  /** Automatically adjust quality based on performance */
  adaptiveQuality: boolean;
  /** Hardware scaling level for Babylon.js (1.0 = native, 0.5 = half res) */
  hardwareScalingLevel: number;

  // Accessibility Settings
  /** Reduce motion for accessibility (respects prefers-reduced-motion) */
  reducedMotion: boolean;
  /** Reduce flash effects intensity */
  reduceFlashing: boolean;
  /** Colorblind mode simulation filter */
  colorblindMode: "none" | "protanopia" | "deuteranopia" | "tritanopia";
  /** High contrast mode for improved visibility */
  highContrastMode: boolean;
}

/**
 * Partial graphics settings for updates
 */
export type GraphicsSettingsUpdate = Partial<GraphicsSettings>;

/**
 * Graphics settings change event
 */
export interface GraphicsSettingsChangeEvent {
  /** Previous settings */
  previous: GraphicsSettings;
  /** New settings */
  current: GraphicsSettings;
  /** Keys that changed */
  changedKeys: (keyof GraphicsSettings)[];
}

/**
 * Settings change listener callback
 */
export type GraphicsSettingsListener = (event: GraphicsSettingsChangeEvent) => void;

/**
 * Performance metrics for adaptive quality
 */
export interface PerformanceMetrics {
  /** Current frames per second */
  fps: number;
  /** Average frame time in milliseconds */
  frameTimeMs: number;
  /** Number of draw calls per frame */
  drawCalls: number;
  /** Number of active particles */
  activeParticles: number;
  /** GPU memory usage estimate (if available) */
  gpuMemoryMB?: number;
}

/**
 * Adaptive quality thresholds
 */
export interface AdaptiveQualityConfig {
  /** FPS threshold to trigger quality reduction */
  lowFpsThreshold: number;
  /** FPS threshold to allow quality increase */
  highFpsThreshold: number;
  /** Minimum time between quality changes (ms) */
  cooldownMs: number;
  /** Number of samples to average for FPS calculation */
  sampleCount: number;
}

/**
 * Device capability assessment for auto-detection
 */
export interface DeviceCapabilities {
  /** Estimated GPU tier (1-3, where 3 is highest) */
  gpuTier: 1 | 2 | 3;
  /** Available system memory category */
  memoryTier: "low" | "medium" | "high";
  /** Whether device supports WebGL 2 */
  webgl2Support: boolean;
  /** Maximum texture size supported */
  maxTextureSize: number;
  /** Whether device supports hardware instancing */
  instancedArraysSupport: boolean;
  /** Recommended quality level based on capabilities */
  recommendedQuality: QualityLevel;
}
