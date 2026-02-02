/**
 * Graphics Settings Storage
 * Persists settings using platform storage abstraction (localStorage/Capacitor Preferences)
 */

import { storage, STORAGE_KEYS } from "../../platform/storage";
import type { GraphicsSettings, GraphicsSettingsUpdate } from "./types";
import { MEDIUM_PRESET, getPresetWithAccessibility } from "./presets";

/**
 * Storage key for graphics settings
 */
const GRAPHICS_STORAGE_KEY = "graphics_settings";

/**
 * Current settings schema version for migration support
 */
const SETTINGS_VERSION = 1;

/**
 * Stored settings structure with versioning
 */
interface StoredSettings {
  version: number;
  settings: GraphicsSettings;
  timestamp: number;
}

/**
 * Validate that stored data has the expected shape
 */
function isValidStoredSettings(data: unknown): data is StoredSettings {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.version === "number" &&
    typeof obj.settings === "object" &&
    obj.settings !== null &&
    typeof obj.timestamp === "number"
  );
}

/**
 * Validate that settings object has all required fields
 */
function isValidGraphicsSettings(data: unknown): data is GraphicsSettings {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const settings = data as Record<string, unknown>;

  // Check required fields exist with correct types
  return (
    typeof settings.quality === "string" &&
    ["low", "medium", "high"].includes(settings.quality) &&
    typeof settings.shadowsEnabled === "boolean" &&
    typeof settings.shadowMapSize === "number" &&
    typeof settings.particleCount === "number" &&
    typeof settings.reflectionsEnabled === "boolean" &&
    typeof settings.antialiasing === "boolean" &&
    typeof settings.postProcessingEnabled === "boolean" &&
    typeof settings.glowLayerEnabled === "boolean" &&
    typeof settings.textureQuality === "number" &&
    typeof settings.motionBlur === "boolean" &&
    typeof settings.screenShake === "boolean" &&
    typeof settings.particlesEnabled === "boolean" &&
    typeof settings.targetFPS === "number" &&
    typeof settings.adaptiveQuality === "boolean" &&
    typeof settings.hardwareScalingLevel === "number" &&
    typeof settings.reducedMotion === "boolean" &&
    typeof settings.reduceFlashing === "boolean"
  );
}

/**
 * Migrate settings from older versions to current version
 */
function migrateSettings(stored: StoredSettings): GraphicsSettings {
  let settings = { ...stored.settings };

  // Version 0 -> 1: Add new fields with defaults
  if (stored.version < 1) {
    settings = {
      ...MEDIUM_PRESET,
      ...settings,
      // Ensure new fields exist
      postProcessingEnabled: settings.postProcessingEnabled ?? MEDIUM_PRESET.postProcessingEnabled,
      glowLayerEnabled: settings.glowLayerEnabled ?? MEDIUM_PRESET.glowLayerEnabled,
      textureQuality: settings.textureQuality ?? MEDIUM_PRESET.textureQuality,
      particlesEnabled: settings.particlesEnabled ?? MEDIUM_PRESET.particlesEnabled,
      hardwareScalingLevel: settings.hardwareScalingLevel ?? MEDIUM_PRESET.hardwareScalingLevel,
      reduceFlashing: settings.reduceFlashing ?? MEDIUM_PRESET.reduceFlashing,
    };
  }

  // Future migrations would go here:
  // if (stored.version < 2) { ... }

  return settings;
}

/**
 * Load graphics settings from persistent storage
 * @param reducedMotionPreference - System reduced motion preference to apply as default
 * @returns Loaded settings or default settings if none stored
 */
export async function loadSettings(
  reducedMotionPreference: boolean = false
): Promise<GraphicsSettings> {
  try {
    const stored = await storage.get<StoredSettings>(GRAPHICS_STORAGE_KEY);

    if (!stored || !isValidStoredSettings(stored)) {
      console.log("[GraphicsStorage] No valid stored settings, using defaults");
      return getPresetWithAccessibility("medium", reducedMotionPreference);
    }

    // Check if migration is needed
    if (stored.version !== SETTINGS_VERSION) {
      console.log(
        `[GraphicsStorage] Migrating settings from v${stored.version} to v${SETTINGS_VERSION}`
      );
      const migrated = migrateSettings(stored);

      // Save migrated settings
      await saveSettings(migrated);
      return migrated;
    }

    // Validate settings structure
    if (!isValidGraphicsSettings(stored.settings)) {
      console.warn("[GraphicsStorage] Invalid settings structure, using defaults");
      return getPresetWithAccessibility("medium", reducedMotionPreference);
    }

    console.log("[GraphicsStorage] Loaded settings:", stored.settings.quality);
    return stored.settings;
  } catch (error) {
    console.error("[GraphicsStorage] Failed to load settings:", error);
    return getPresetWithAccessibility("medium", reducedMotionPreference);
  }
}

/**
 * Save graphics settings to persistent storage
 * @param settings - Complete settings object to save
 */
export async function saveSettings(settings: GraphicsSettings): Promise<void> {
  try {
    const stored: StoredSettings = {
      version: SETTINGS_VERSION,
      settings,
      timestamp: Date.now(),
    };

    await storage.set(GRAPHICS_STORAGE_KEY, stored);
    console.log("[GraphicsStorage] Saved settings:", settings.quality);
  } catch (error) {
    console.error("[GraphicsStorage] Failed to save settings:", error);
    throw error;
  }
}

/**
 * Update specific settings fields and save
 * @param currentSettings - Current complete settings
 * @param update - Partial settings to update
 * @returns Updated complete settings
 */
export async function updateSettings(
  currentSettings: GraphicsSettings,
  update: GraphicsSettingsUpdate
): Promise<GraphicsSettings> {
  const newSettings: GraphicsSettings = {
    ...currentSettings,
    ...update,
  };

  await saveSettings(newSettings);
  return newSettings;
}

/**
 * Clear stored graphics settings (reset to defaults)
 */
export async function clearSettings(): Promise<void> {
  try {
    await storage.remove(GRAPHICS_STORAGE_KEY);
    console.log("[GraphicsStorage] Cleared settings");
  } catch (error) {
    console.error("[GraphicsStorage] Failed to clear settings:", error);
    throw error;
  }
}

/**
 * Check if settings have been saved before
 */
export async function hasStoredSettings(): Promise<boolean> {
  try {
    const stored = await storage.get<StoredSettings>(GRAPHICS_STORAGE_KEY);
    return stored !== null && isValidStoredSettings(stored);
  } catch {
    return false;
  }
}

/**
 * Get the timestamp of when settings were last saved
 */
export async function getSettingsTimestamp(): Promise<number | null> {
  try {
    const stored = await storage.get<StoredSettings>(GRAPHICS_STORAGE_KEY);
    if (stored && isValidStoredSettings(stored)) {
      return stored.timestamp;
    }
    return null;
  } catch {
    return null;
  }
}
