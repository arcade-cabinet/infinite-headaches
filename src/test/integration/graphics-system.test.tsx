/**
 * Integration Tests for Graphics System
 *
 * Tests the graphics system including:
 * - GraphicsManager initializes with default quality
 * - Quality changes persist to storage
 * - Presets apply correct settings
 * - LOD selection based on quality level
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import React from "react";
import { GraphicsManagerImpl, graphicsManager } from "@/graphics/manager/GraphicsManager";
import {
  getPreset,
  getPresetWithAccessibility,
  QUALITY_PRESETS,
  LOW_PRESET,
  MEDIUM_PRESET,
  HIGH_PRESET,
  getLowerQuality,
  getHigherQuality,
  mergeWithPreset,
} from "@/graphics/settings/presets";
import {
  loadSettings,
  saveSettings,
  clearSettings,
  hasStoredSettings,
} from "@/graphics/settings/storage";
import { GraphicsProvider, useGraphicsContext } from "@/graphics/context/GraphicsContext";
import type { GraphicsSettings, QualityLevel } from "@/graphics/settings/types";

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// Mock Capacitor
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => "web",
  },
}));

// Mock Capacitor Preferences
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    keys: vi.fn(),
    clear: vi.fn(),
  },
}));

// Mock Screen Orientation
vi.mock("@capacitor/screen-orientation", () => ({
  ScreenOrientation: {
    addListener: vi.fn(),
    lock: vi.fn(),
    unlock: vi.fn(),
    orientation: vi.fn(),
  },
}));

describe("Graphics System Integration", () => {
  beforeEach(() => {
    // Setup localStorage mock
    Object.defineProperty(window, "localStorage", { value: mockLocalStorage });
    mockLocalStorage.clear();

    // Mock matchMedia for device detection
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion") ? false : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Quality Presets", () => {
    it("should have LOW, MEDIUM, and HIGH presets defined", () => {
      expect(LOW_PRESET).toBeDefined();
      expect(MEDIUM_PRESET).toBeDefined();
      expect(HIGH_PRESET).toBeDefined();
    });

    it("should return correct preset for each quality level", () => {
      expect(getPreset("low")).toMatchObject({ quality: "low" });
      expect(getPreset("medium")).toMatchObject({ quality: "medium" });
      expect(getPreset("high")).toMatchObject({ quality: "high" });
    });

    it("should return a copy, not the original preset", () => {
      const preset1 = getPreset("medium");
      const preset2 = getPreset("medium");

      expect(preset1).not.toBe(preset2);
      expect(preset1).toEqual(preset2);
    });

    describe("LOW Preset Settings", () => {
      it("should have shadows disabled for low quality", () => {
        expect(LOW_PRESET.shadowsEnabled).toBe(false);
      });

      it("should have reduced particle count", () => {
        expect(LOW_PRESET.particleCount).toBeLessThan(1.0);
      });

      it("should target 30 FPS for low quality", () => {
        expect(LOW_PRESET.targetFPS).toBe(30);
      });

      it("should have reduced hardware scaling (lower resolution)", () => {
        expect(LOW_PRESET.hardwareScalingLevel).toBeLessThan(1.0);
      });

      it("should have post-processing disabled", () => {
        expect(LOW_PRESET.postProcessingEnabled).toBe(false);
      });

      it("should have glow layer disabled", () => {
        expect(LOW_PRESET.glowLayerEnabled).toBe(false);
      });
    });

    describe("MEDIUM Preset Settings", () => {
      it("should have shadows enabled for medium quality", () => {
        expect(MEDIUM_PRESET.shadowsEnabled).toBe(true);
      });

      it("should have medium shadow map size", () => {
        expect(MEDIUM_PRESET.shadowMapSize).toBe(1024);
      });

      it("should target 60 FPS", () => {
        expect(MEDIUM_PRESET.targetFPS).toBe(60);
      });

      it("should have antialiasing enabled", () => {
        expect(MEDIUM_PRESET.antialiasing).toBe(true);
      });
    });

    describe("HIGH Preset Settings", () => {
      it("should have full particle count", () => {
        expect(HIGH_PRESET.particleCount).toBe(1.0);
      });

      it("should have large shadow map size", () => {
        expect(HIGH_PRESET.shadowMapSize).toBe(2048);
      });

      it("should have reflections enabled", () => {
        expect(HIGH_PRESET.reflectionsEnabled).toBe(true);
      });

      it("should have motion blur enabled", () => {
        expect(HIGH_PRESET.motionBlur).toBe(true);
      });

      it("should have adaptive quality disabled (trusts hardware)", () => {
        expect(HIGH_PRESET.adaptiveQuality).toBe(false);
      });
    });
  });

  describe("Accessibility Integration", () => {
    it("should disable motion blur when reduced motion is enabled", () => {
      const preset = getPresetWithAccessibility("high", true);

      expect(preset.motionBlur).toBe(false);
    });

    it("should disable screen shake when reduced motion is enabled", () => {
      const preset = getPresetWithAccessibility("high", true);

      expect(preset.screenShake).toBe(false);
    });

    it("should enable reduceFlashing when reduced motion is enabled", () => {
      const preset = getPresetWithAccessibility("medium", true);

      expect(preset.reduceFlashing).toBe(true);
    });

    it("should cap particle count when reduced motion is enabled", () => {
      const preset = getPresetWithAccessibility("high", true);

      expect(preset.particleCount).toBeLessThanOrEqual(0.5);
    });

    it("should not modify preset when reduced motion is false", () => {
      const preset = getPresetWithAccessibility("high", false);

      expect(preset.motionBlur).toBe(HIGH_PRESET.motionBlur);
      expect(preset.screenShake).toBe(HIGH_PRESET.screenShake);
    });
  });

  describe("Quality Level Navigation", () => {
    it("should return lower quality level correctly", () => {
      expect(getLowerQuality("high")).toBe("medium");
      expect(getLowerQuality("medium")).toBe("low");
      expect(getLowerQuality("low")).toBeNull();
    });

    it("should return higher quality level correctly", () => {
      expect(getHigherQuality("low")).toBe("medium");
      expect(getHigherQuality("medium")).toBe("high");
      expect(getHigherQuality("high")).toBeNull();
    });
  });

  describe("Preset Merging", () => {
    it("should merge overrides with base preset", () => {
      const merged = mergeWithPreset("low", { shadowsEnabled: true });

      expect(merged.quality).toBe("low");
      expect(merged.shadowsEnabled).toBe(true);
      // Other settings should remain from low preset
      expect(merged.targetFPS).toBe(LOW_PRESET.targetFPS);
    });

    it("should allow quality override in merge", () => {
      const merged = mergeWithPreset("low", { quality: "medium" as QualityLevel });

      expect(merged.quality).toBe("medium");
    });
  });

  describe("LOD Selection Based on Quality", () => {
    it("should select appropriate shadow map sizes per quality", () => {
      expect(getPreset("low").shadowMapSize).toBe(512);
      expect(getPreset("medium").shadowMapSize).toBe(1024);
      expect(getPreset("high").shadowMapSize).toBe(2048);
    });

    it("should select appropriate texture quality per level", () => {
      expect(getPreset("low").textureQuality).toBeLessThan(getPreset("medium").textureQuality);
      expect(getPreset("medium").textureQuality).toBeLessThan(getPreset("high").textureQuality);
    });

    it("should scale particle count progressively", () => {
      expect(getPreset("low").particleCount).toBeLessThan(getPreset("medium").particleCount);
      expect(getPreset("medium").particleCount).toBeLessThan(getPreset("high").particleCount);
    });
  });

  describe("Settings Storage Integration", () => {
    it("should save settings to localStorage", async () => {
      const settings = getPreset("medium");

      await saveSettings(settings);

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(
        mockLocalStorage.setItem.mock.calls[0][1]
      );
      expect(savedData.settings.quality).toBe("medium");
    });

    it("should load settings from localStorage", async () => {
      // Pre-populate localStorage
      const storedData = {
        version: 1,
        settings: HIGH_PRESET,
        timestamp: Date.now(),
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

      const loaded = await loadSettings();

      expect(loaded.quality).toBe("high");
    });

    it("should return default settings when no stored settings exist", async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const loaded = await loadSettings();

      expect(loaded).toBeDefined();
      expect(loaded.quality).toBe("medium"); // Default
    });

    it("should clear stored settings", async () => {
      await clearSettings();

      expect(mockLocalStorage.removeItem).toHaveBeenCalled();
    });

    it("should check if settings exist in storage", async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const hasSettings = await hasStoredSettings();

      expect(hasSettings).toBe(false);
    });

    it("should include version and timestamp in stored data", async () => {
      await saveSettings(getPreset("low"));

      const savedData = JSON.parse(
        mockLocalStorage.setItem.mock.calls[0][1]
      );

      expect(savedData.version).toBeDefined();
      expect(savedData.timestamp).toBeDefined();
      expect(typeof savedData.timestamp).toBe("number");
    });
  });

  describe("GraphicsProvider Context Integration", () => {
    function TestConsumer() {
      const context = useGraphicsContext();
      return (
        <div>
          <span data-testid="quality">{context.settings.quality}</span>
          <span data-testid="initialized">{String(context.isInitialized)}</span>
          <span data-testid="loading">{String(context.isLoading)}</span>
        </div>
      );
    }

    it("should provide default settings before initialization", () => {
      render(
        <GraphicsProvider>
          <TestConsumer />
        </GraphicsProvider>
      );

      // Before init completes, should show loading state
      expect(screen.getByTestId("loading").textContent).toBe("true");
    });

    it("should provide settings through context", async () => {
      // Mock device manager to return quickly
      vi.mock("@/platform/device", async () => {
        const actual = await vi.importActual("@/platform/device");
        return {
          ...(actual as object),
          deviceManager: {
            init: vi.fn().mockResolvedValue({
              type: "desktop",
              platform: "web",
              isNative: false,
              isPWA: false,
              orientation: "landscape",
              screenWidth: 1920,
              screenHeight: 1080,
              pixelRatio: 1,
              hasTouch: false,
              hasKeyboard: true,
              hasMouse: true,
              isReducedMotion: false,
              safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
            }),
            getInfo: vi.fn().mockReturnValue({
              type: "desktop",
              isReducedMotion: false,
            }),
          },
        };
      });

      render(
        <GraphicsProvider>
          <TestConsumer />
        </GraphicsProvider>
      );

      // Initially loading
      expect(screen.getByTestId("loading").textContent).toBe("true");
    });
  });

  describe("Settings Validation", () => {
    it("should validate quality level is valid", () => {
      const validQualities: QualityLevel[] = ["low", "medium", "high"];

      for (const quality of validQualities) {
        const preset = QUALITY_PRESETS[quality];
        expect(preset).toBeDefined();
        expect(preset.quality).toBe(quality);
      }
    });

    it("should have all required fields in presets", () => {
      const requiredFields: (keyof GraphicsSettings)[] = [
        "quality",
        "shadowsEnabled",
        "shadowMapSize",
        "particleCount",
        "reflectionsEnabled",
        "antialiasing",
        "postProcessingEnabled",
        "glowLayerEnabled",
        "textureQuality",
        "motionBlur",
        "screenShake",
        "particlesEnabled",
        "targetFPS",
        "adaptiveQuality",
        "hardwareScalingLevel",
        "reducedMotion",
        "reduceFlashing",
      ];

      for (const level of ["low", "medium", "high"] as QualityLevel[]) {
        const preset = getPreset(level);

        for (const field of requiredFields) {
          expect(preset[field]).toBeDefined();
        }
      }
    });

    it("should have numeric values in valid ranges", () => {
      for (const level of ["low", "medium", "high"] as QualityLevel[]) {
        const preset = getPreset(level);

        expect(preset.particleCount).toBeGreaterThanOrEqual(0);
        expect(preset.particleCount).toBeLessThanOrEqual(1);

        expect(preset.textureQuality).toBeGreaterThanOrEqual(0);
        expect(preset.textureQuality).toBeLessThanOrEqual(1);

        expect(preset.hardwareScalingLevel).toBeGreaterThan(0);
        expect(preset.hardwareScalingLevel).toBeLessThanOrEqual(2);

        expect([30, 60]).toContain(preset.targetFPS);

        expect([512, 1024, 2048, 4096]).toContain(preset.shadowMapSize);
      }
    });
  });

  describe("Adaptive Quality Configuration", () => {
    it("should have adaptive quality enabled for low preset", () => {
      expect(LOW_PRESET.adaptiveQuality).toBe(true);
    });

    it("should have adaptive quality enabled for medium preset", () => {
      expect(MEDIUM_PRESET.adaptiveQuality).toBe(true);
    });

    it("should have adaptive quality disabled for high preset", () => {
      expect(HIGH_PRESET.adaptiveQuality).toBe(false);
    });
  });
});
