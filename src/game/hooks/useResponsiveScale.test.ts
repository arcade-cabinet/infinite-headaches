/**
 * Tests for useResponsiveScale utilities
 *
 * Tests the pure utility functions exported from useResponsiveScale.
 * The hook itself (useResponsiveScale) depends on React and deviceManager,
 * so we focus on the stateless helpers that drive scaling calculations.
 */

import { describe, expect, it } from "vitest";
import {
  getResponsiveAnimalSize,
  getResponsivePhysics,
  getResponsiveTouchTargetSize,
  getOptimalCanvasResolution,
} from "./useResponsiveScale";
import type { DeviceInfo } from "../../platform/device";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeviceInfo(overrides: Partial<DeviceInfo> = {}): DeviceInfo {
  return {
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
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getResponsiveAnimalSize
// ---------------------------------------------------------------------------

describe("getResponsiveAnimalSize", () => {
  it("returns base dimensions at scale 1.0", () => {
    const size = getResponsiveAnimalSize(1.0);
    expect(size.width).toBe(80);
    expect(size.height).toBe(70);
  });

  it("scales up dimensions proportionally", () => {
    const size = getResponsiveAnimalSize(1.5);
    expect(size.width).toBe(120);
    expect(size.height).toBe(105);
  });

  it("scales down dimensions proportionally", () => {
    const size = getResponsiveAnimalSize(0.5);
    expect(size.width).toBe(40);
    expect(size.height).toBe(35);
  });

  it("returns integers (rounded)", () => {
    const size = getResponsiveAnimalSize(0.33);
    expect(Number.isInteger(size.width)).toBe(true);
    expect(Number.isInteger(size.height)).toBe(true);
  });

  it("handles zero scale", () => {
    const size = getResponsiveAnimalSize(0);
    expect(size.width).toBe(0);
    expect(size.height).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getResponsivePhysics
// ---------------------------------------------------------------------------

describe("getResponsivePhysics", () => {
  it("returns base physics at scale 1.0", () => {
    const physics = getResponsivePhysics(1.0);
    expect(physics.gravity).toBe(20);
    expect(physics.spawnOffset).toBe(300);
  });

  it("scales physics values up", () => {
    const physics = getResponsivePhysics(2.0);
    expect(physics.gravity).toBe(40);
    expect(physics.spawnOffset).toBe(600);
  });

  it("scales physics values down", () => {
    const physics = getResponsivePhysics(0.5);
    expect(physics.gravity).toBe(10);
    expect(physics.spawnOffset).toBe(150);
  });

  it("returns integers (rounded)", () => {
    const physics = getResponsivePhysics(0.33);
    expect(Number.isInteger(physics.gravity)).toBe(true);
    expect(Number.isInteger(physics.spawnOffset)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getResponsiveTouchTargetSize
// ---------------------------------------------------------------------------

describe("getResponsiveTouchTargetSize", () => {
  it("returns 44x44 default when no device info", () => {
    const size = getResponsiveTouchTargetSize(null);
    expect(size.minWidth).toBe(44);
    expect(size.minHeight).toBe(44);
  });

  it("returns 48x48 for Android devices", () => {
    const device = makeDeviceInfo({ platform: "android" });
    const size = getResponsiveTouchTargetSize(device);
    expect(size.minWidth).toBe(48);
    expect(size.minHeight).toBe(48);
  });

  it("returns 44x44 for iOS devices", () => {
    const device = makeDeviceInfo({ platform: "ios" });
    const size = getResponsiveTouchTargetSize(device);
    expect(size.minWidth).toBe(44);
    expect(size.minHeight).toBe(44);
  });

  it("returns 44x44 for web platform", () => {
    const device = makeDeviceInfo({ platform: "web" });
    const size = getResponsiveTouchTargetSize(device);
    expect(size.minWidth).toBe(44);
    expect(size.minHeight).toBe(44);
  });
});

// ---------------------------------------------------------------------------
// getOptimalCanvasResolution
// ---------------------------------------------------------------------------

describe("getOptimalCanvasResolution", () => {
  it("returns 1:1 resolution at pixel ratio 1", () => {
    const device = makeDeviceInfo({ pixelRatio: 1 });
    const res = getOptimalCanvasResolution(800, 600, device);
    expect(res.width).toBe(800);
    expect(res.height).toBe(600);
    expect(res.scale).toBe(1);
  });

  it("scales resolution for 2x pixel ratio on desktop", () => {
    const device = makeDeviceInfo({ type: "desktop", pixelRatio: 2 });
    const res = getOptimalCanvasResolution(800, 600, device);
    expect(res.width).toBe(1600);
    expect(res.height).toBe(1200);
    expect(res.scale).toBe(2);
  });

  it("caps pixel ratio at 2 for phones", () => {
    const device = makeDeviceInfo({ type: "phone", pixelRatio: 3 });
    const res = getOptimalCanvasResolution(375, 812, device);
    expect(res.scale).toBe(2);
    expect(res.width).toBe(750);
    expect(res.height).toBe(1624);
  });

  it("caps pixel ratio at 2.5 for tablets", () => {
    const device = makeDeviceInfo({ type: "tablet", pixelRatio: 3 });
    const res = getOptimalCanvasResolution(1024, 768, device);
    expect(res.scale).toBe(2.5);
    expect(res.width).toBe(2560);
    expect(res.height).toBe(1920);
  });

  it("reduces pixel ratio for reduced motion preference", () => {
    const device = makeDeviceInfo({
      type: "desktop",
      pixelRatio: 3,
      isReducedMotion: true,
    });
    const res = getOptimalCanvasResolution(1920, 1080, device);
    expect(res.scale).toBe(1.5);
  });

  it("reduced motion on phone uses minimum of phone cap and 1.5", () => {
    const device = makeDeviceInfo({
      type: "phone",
      pixelRatio: 3,
      isReducedMotion: true,
    });
    const res = getOptimalCanvasResolution(375, 812, device);
    // Phone caps at 2, then reduced motion caps at 1.5
    expect(res.scale).toBe(1.5);
  });

  it("returns rounded integer dimensions", () => {
    const device = makeDeviceInfo({ pixelRatio: 1.5 });
    const res = getOptimalCanvasResolution(333, 555, device);
    expect(Number.isInteger(res.width)).toBe(true);
    expect(Number.isInteger(res.height)).toBe(true);
  });

  it("falls back to window.devicePixelRatio when no device info", () => {
    // With null device info, uses window.devicePixelRatio (1 in test env)
    const res = getOptimalCanvasResolution(800, 600, null);
    expect(res.width).toBe(800);
    expect(res.height).toBe(600);
  });
});
