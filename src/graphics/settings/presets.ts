/**
 * Graphics Quality Presets
 * Pre-configured settings for different device capabilities
 */

import type { GraphicsSettings, QualityLevel, AdaptiveQualityConfig } from "./types";

/**
 * LOW preset - Optimized for phones and low-end devices
 * Prioritizes performance and battery life over visual quality
 */
export const LOW_PRESET: GraphicsSettings = {
  quality: "low",

  // Babylon.js settings - minimal
  shadowsEnabled: false,
  shadowMapSize: 512,
  particleCount: 0.3, // 30% of max particles
  reflectionsEnabled: false,
  antialiasing: false,
  postProcessingEnabled: false,
  glowLayerEnabled: false,
  textureQuality: 0.5,

  // Canvas 2D settings - reduced
  motionBlur: false,
  screenShake: true, // Keep for game feel
  particlesEnabled: true, // Keep but count is reduced

  // Performance - conservative
  targetFPS: 30,
  adaptiveQuality: true,
  hardwareScalingLevel: 0.75, // Render at 75% resolution

  // Accessibility
  reducedMotion: false,
  reduceFlashing: false,
};

/**
 * MEDIUM preset - Balanced for tablets and mid-range devices
 * Good visual quality with acceptable performance
 */
export const MEDIUM_PRESET: GraphicsSettings = {
  quality: "medium",

  // Babylon.js settings - balanced
  shadowsEnabled: true,
  shadowMapSize: 1024,
  particleCount: 0.6, // 60% of max particles
  reflectionsEnabled: false,
  antialiasing: true,
  postProcessingEnabled: true,
  glowLayerEnabled: true,
  textureQuality: 0.75,

  // Canvas 2D settings - most enabled
  motionBlur: false,
  screenShake: true,
  particlesEnabled: true,

  // Performance - balanced
  targetFPS: 60,
  adaptiveQuality: true,
  hardwareScalingLevel: 1.0,

  // Accessibility
  reducedMotion: false,
  reduceFlashing: false,
};

/**
 * HIGH preset - Maximum quality for desktop and high-end devices
 * Full visual fidelity, assumes powerful hardware
 */
export const HIGH_PRESET: GraphicsSettings = {
  quality: "high",

  // Babylon.js settings - maximum
  shadowsEnabled: true,
  shadowMapSize: 2048,
  particleCount: 1.0, // 100% of max particles
  reflectionsEnabled: true,
  antialiasing: true,
  postProcessingEnabled: true,
  glowLayerEnabled: true,
  textureQuality: 1.0,

  // Canvas 2D settings - all enabled
  motionBlur: true,
  screenShake: true,
  particlesEnabled: true,

  // Performance - maximum quality
  targetFPS: 60,
  adaptiveQuality: false, // Trust the hardware
  hardwareScalingLevel: 1.0,

  // Accessibility
  reducedMotion: false,
  reduceFlashing: false,
};

/**
 * Quality preset map for easy lookup
 */
export const QUALITY_PRESETS: Record<QualityLevel, GraphicsSettings> = {
  low: LOW_PRESET,
  medium: MEDIUM_PRESET,
  high: HIGH_PRESET,
};

/**
 * Get preset by quality level
 */
export function getPreset(level: QualityLevel): GraphicsSettings {
  return { ...QUALITY_PRESETS[level] };
}

/**
 * Get preset with accessibility overrides applied
 * @param level - Quality level preset
 * @param reducedMotion - Whether user prefers reduced motion
 */
export function getPresetWithAccessibility(
  level: QualityLevel,
  reducedMotion: boolean
): GraphicsSettings {
  const preset = getPreset(level);

  if (reducedMotion) {
    return {
      ...preset,
      reducedMotion: true,
      motionBlur: false,
      screenShake: false,
      reduceFlashing: true,
      // Reduce particle intensity for less visual noise
      particleCount: Math.min(preset.particleCount, 0.5),
    };
  }

  return preset;
}

/**
 * Default adaptive quality configuration
 */
export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveQualityConfig = {
  lowFpsThreshold: 25, // Reduce quality if FPS drops below this
  highFpsThreshold: 55, // Can increase quality if FPS stays above this
  cooldownMs: 5000, // Wait 5 seconds between quality changes
  sampleCount: 30, // Average over 30 frames (~0.5 seconds at 60fps)
};

/**
 * Quality level ordering for adaptive quality adjustments
 */
export const QUALITY_ORDER: QualityLevel[] = ["low", "medium", "high"];

/**
 * Get next lower quality level
 */
export function getLowerQuality(current: QualityLevel): QualityLevel | null {
  const index = QUALITY_ORDER.indexOf(current);
  if (index <= 0) return null;
  return QUALITY_ORDER[index - 1];
}

/**
 * Get next higher quality level
 */
export function getHigherQuality(current: QualityLevel): QualityLevel | null {
  const index = QUALITY_ORDER.indexOf(current);
  if (index >= QUALITY_ORDER.length - 1) return null;
  return QUALITY_ORDER[index + 1];
}

/**
 * Merge partial settings with a preset base
 */
export function mergeWithPreset(
  base: QualityLevel,
  overrides: Partial<GraphicsSettings>
): GraphicsSettings {
  const preset = getPreset(base);
  return {
    ...preset,
    ...overrides,
    // Ensure quality reflects the base unless explicitly overridden
    quality: overrides.quality ?? base,
  };
}
