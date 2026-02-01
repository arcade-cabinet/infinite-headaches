/**
 * Integration Tests for Hooks
 *
 * Tests how hooks work together including:
 * - useDevice returns correct device info
 * - useInput handles touch/mouse events
 * - useGraphics integrates with context
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import type { ReactNode } from "react";
import { useDevice, useOrientation, useSafeAreaInsets, useIsMobileDevice } from "@/hooks/useDevice";
import { useInput, useGameControls, useDrag, useKeyboard, useInputMethod } from "@/hooks/useInput";
import { inputManager } from "@/platform/input";
import { deviceManager } from "@/platform/device";

// Mock Capacitor
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => "web",
  },
}));

// Mock Screen Orientation
vi.mock("@capacitor/screen-orientation", () => ({
  ScreenOrientation: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    lock: vi.fn(),
    unlock: vi.fn(),
    orientation: vi.fn(),
  },
}));

describe("Hooks Integration", () => {
  beforeEach(() => {
    // Mock window properties
    Object.defineProperty(window, "innerWidth", { value: 1920, writable: true });
    Object.defineProperty(window, "innerHeight", { value: 1080, writable: true });
    Object.defineProperty(window, "devicePixelRatio", { value: 1, writable: true });

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches:
          query.includes("pointer: fine") ||
          query.includes("hover: hover") ||
          (query.includes("prefers-color-scheme: dark") ? true : false),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock navigator
    Object.defineProperty(navigator, "maxTouchPoints", { value: 0, writable: true });
    Object.defineProperty(navigator, "getGamepads", {
      value: () => [null, null, null, null],
      writable: true,
    });

    // Mock CSS.supports
    Object.defineProperty(window, "CSS", {
      value: {
        supports: vi.fn().mockReturnValue(false),
      },
      writable: true,
    });

    // Mock screen orientation
    Object.defineProperty(screen, "orientation", {
      value: {
        type: "landscape-primary",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    inputManager.destroy();
  });

  describe("useDevice Hook", () => {
    it("should return device info after initialization", async () => {
      const { result } = renderHook(() => useDevice());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      }, { timeout: 2000 });
    });

    it("should detect desktop device type for large screens without touch", async () => {
      // Setup for desktop detection
      Object.defineProperty(window, "innerWidth", { value: 1920 });
      Object.defineProperty(window, "innerHeight", { value: 1080 });
      Object.defineProperty(navigator, "maxTouchPoints", { value: 0 });

      const { result } = renderHook(() => useDevice());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      }, { timeout: 2000 });

      // On web with no touch and large screen, should be desktop
      expect(result.current.hasKeyboard).toBe(true);
    });

    it("should provide orientation information", async () => {
      const { result } = renderHook(() => useDevice());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      }, { timeout: 2000 });

      expect(["portrait", "landscape"]).toContain(result.current.orientation);
    });

    it("should detect landscape for wide screens", async () => {
      Object.defineProperty(window, "innerWidth", { value: 1920 });
      Object.defineProperty(window, "innerHeight", { value: 1080 });

      const { result } = renderHook(() => useDevice());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      }, { timeout: 2000 });

      expect(result.current.isLandscape).toBe(true);
      expect(result.current.isPortrait).toBe(false);
    });

    it("should provide safe area insets", async () => {
      const { result } = renderHook(() => useDevice());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      }, { timeout: 2000 });

      expect(result.current.safeAreaInsets).toBeDefined();
      expect(typeof result.current.safeAreaInsets.top).toBe("number");
      expect(typeof result.current.safeAreaInsets.bottom).toBe("number");
      expect(typeof result.current.safeAreaInsets.left).toBe("number");
      expect(typeof result.current.safeAreaInsets.right).toBe("number");
    });

    it("should provide screen dimensions", async () => {
      const { result } = renderHook(() => useDevice());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      }, { timeout: 2000 });

      expect(result.current.screenWidth).toBeGreaterThan(0);
      expect(result.current.screenHeight).toBeGreaterThan(0);
    });

    it("should provide pixel ratio", async () => {
      const { result } = renderHook(() => useDevice());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      }, { timeout: 2000 });

      expect(result.current.pixelRatio).toBeGreaterThanOrEqual(1);
    });

    it("should provide lockOrientation function", async () => {
      const { result } = renderHook(() => useDevice());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      }, { timeout: 2000 });

      expect(typeof result.current.lockOrientation).toBe("function");
    });

    it("should provide getGameViewport function", async () => {
      const { result } = renderHook(() => useDevice());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      }, { timeout: 2000 });

      expect(typeof result.current.getGameViewport).toBe("function");

      const viewport = result.current.getGameViewport();
      expect(viewport).toHaveProperty("width");
      expect(viewport).toHaveProperty("height");
      expect(viewport).toHaveProperty("offsetTop");
      expect(viewport).toHaveProperty("offsetLeft");
    });
  });

  describe("useOrientation Hook", () => {
    it("should return current orientation", async () => {
      const { result } = renderHook(() => useOrientation());

      await waitFor(() => {
        expect(["portrait", "landscape"]).toContain(result.current);
      }, { timeout: 2000 });
    });
  });

  describe("useSafeAreaInsets Hook", () => {
    it("should return safe area insets", async () => {
      const { result } = renderHook(() => useSafeAreaInsets());

      await waitFor(() => {
        expect(result.current).toBeDefined();
      }, { timeout: 2000 });

      expect(result.current).toHaveProperty("top");
      expect(result.current).toHaveProperty("bottom");
      expect(result.current).toHaveProperty("left");
      expect(result.current).toHaveProperty("right");
    });
  });

  describe("useIsMobileDevice Hook", () => {
    it("should return boolean for mobile detection", async () => {
      const { result } = renderHook(() => useIsMobileDevice());

      await waitFor(() => {
        expect(typeof result.current).toBe("boolean");
      }, { timeout: 2000 });
    });
  });

  describe("useInput Hook", () => {
    beforeEach(async () => {
      await inputManager.init();
    });

    it("should initialize and provide input state", () => {
      const { result } = renderHook(() => useInput());

      expect(result.current.activeSource).toBeDefined();
      expect(typeof result.current.isUsingTouch).toBe("boolean");
      expect(typeof result.current.isUsingKeyboard).toBe("boolean");
      expect(typeof result.current.isUsingMouse).toBe("boolean");
      expect(typeof result.current.isDragging).toBe("boolean");
    });

    it("should provide getState function", () => {
      const { result } = renderHook(() => useInput());

      expect(typeof result.current.getState).toBe("function");

      const state = result.current.getState();
      expect(state).toHaveProperty("movement");
      expect(state).toHaveProperty("primaryAction");
      expect(state).toHaveProperty("secondaryAction");
      expect(state).toHaveProperty("pause");
      expect(state).toHaveProperty("activeSource");
    });

    it("should provide getMovement function", () => {
      const { result } = renderHook(() => useInput());

      expect(typeof result.current.getMovement).toBe("function");

      const movement = result.current.getMovement();
      expect(movement).toHaveProperty("x");
      expect(movement).toHaveProperty("y");
    });

    it("should call onMove callback when movement detected", async () => {
      const onMove = vi.fn();
      renderHook(() => useInput({ onMove }));

      // Simulate keyboard input
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
      });

      await waitFor(() => {
        expect(onMove).toHaveBeenCalled();
      });
    });

    it("should call onPause callback when pause key pressed", async () => {
      const onPause = vi.fn();
      renderHook(() => useInput({ onPause }));

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape" }));
      });

      await waitFor(() => {
        expect(onPause).toHaveBeenCalled();
      });
    });

    it("should call onAction callback when action key pressed", async () => {
      const onAction = vi.fn();
      renderHook(() => useInput({ onAction }));

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
      });

      await waitFor(() => {
        expect(onAction).toHaveBeenCalled();
      });
    });

    it("should support enabled option to disable input", () => {
      const onAction = vi.fn();
      const { result } = renderHook(() => useInput({ onAction, enabled: false }));

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
      });

      // Should not be called when disabled
      expect(onAction).not.toHaveBeenCalled();
    });
  });

  describe("useGameControls Hook", () => {
    beforeEach(async () => {
      await inputManager.init();
    });

    it("should provide movement state", () => {
      const { result } = renderHook(() => useGameControls());

      expect(result.current.movement).toBeDefined();
      expect(typeof result.current.x).toBe("number");
      expect(typeof result.current.y).toBe("number");
    });

    it("should provide action states", () => {
      const { result } = renderHook(() => useGameControls());

      expect(typeof result.current.isPrimaryAction).toBe("boolean");
      expect(typeof result.current.isSecondaryAction).toBe("boolean");
    });

    it("should provide isMoving state", () => {
      const { result } = renderHook(() => useGameControls());

      expect(typeof result.current.isMoving).toBe("boolean");
    });

    it("should detect movement from keyboard input", async () => {
      const { result } = renderHook(() => useGameControls());

      expect(result.current.isMoving).toBe(false);

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
      });

      await waitFor(() => {
        expect(result.current.y).toBe(-1);
        expect(result.current.isMoving).toBe(true);
      });

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
      });

      await waitFor(() => {
        expect(result.current.y).toBe(0);
        expect(result.current.isMoving).toBe(false);
      });
    });
  });

  describe("useDrag Hook", () => {
    beforeEach(async () => {
      await inputManager.init();
    });

    it("should provide drag state", () => {
      const { result } = renderHook(() => useDrag());

      expect(typeof result.current.isDragging).toBe("boolean");
      expect(result.current.dragStart).toBeNull();
      expect(result.current.dragPosition).toBeNull();
      expect(result.current.dragDelta).toEqual({ x: 0, y: 0 });
    });

    it("should track drag start on mouse down", async () => {
      const { result } = renderHook(() => useDrag());

      act(() => {
        window.dispatchEvent(
          new MouseEvent("mousedown", { clientX: 100, clientY: 200 })
        );
      });

      await waitFor(() => {
        expect(result.current.isDragging).toBe(true);
        expect(result.current.dragStart).toEqual({ x: 100, y: 200 });
      });
    });

    it("should track drag position during mouse move", async () => {
      const { result } = renderHook(() => useDrag());

      act(() => {
        window.dispatchEvent(
          new MouseEvent("mousedown", { clientX: 100, clientY: 100 })
        );
      });

      await waitFor(() => {
        expect(result.current.isDragging).toBe(true);
      });

      act(() => {
        window.dispatchEvent(
          new MouseEvent("mousemove", { clientX: 150, clientY: 200 })
        );
      });

      await waitFor(() => {
        expect(result.current.dragPosition).toEqual({ x: 150, y: 200 });
        expect(result.current.dragDelta).toEqual({ x: 50, y: 100 });
      });
    });

    it("should reset on mouse up", async () => {
      const { result } = renderHook(() => useDrag());

      act(() => {
        window.dispatchEvent(
          new MouseEvent("mousedown", { clientX: 100, clientY: 100 })
        );
      });

      await waitFor(() => {
        expect(result.current.isDragging).toBe(true);
      });

      act(() => {
        window.dispatchEvent(
          new MouseEvent("mouseup", { clientX: 100, clientY: 100 })
        );
      });

      await waitFor(() => {
        expect(result.current.isDragging).toBe(false);
        expect(result.current.dragStart).toBeNull();
        expect(result.current.dragPosition).toBeNull();
      });
    });

    it("should call onDrag callback during drag", async () => {
      const onDrag = vi.fn();
      renderHook(() => useDrag(onDrag));

      act(() => {
        window.dispatchEvent(
          new MouseEvent("mousedown", { clientX: 100, clientY: 100 })
        );
      });

      act(() => {
        window.dispatchEvent(
          new MouseEvent("mousemove", { clientX: 150, clientY: 150 })
        );
      });

      await waitFor(() => {
        expect(onDrag).toHaveBeenCalled();
      });
    });

    it("should support enabled option", async () => {
      const onDrag = vi.fn();
      renderHook(() => useDrag(onDrag, { enabled: false }));

      act(() => {
        window.dispatchEvent(
          new MouseEvent("mousedown", { clientX: 100, clientY: 100 })
        );
      });

      act(() => {
        window.dispatchEvent(
          new MouseEvent("mousemove", { clientX: 150, clientY: 150 })
        );
      });

      expect(onDrag).not.toHaveBeenCalled();
    });
  });

  describe("useKeyboard Hook", () => {
    beforeEach(async () => {
      await inputManager.init();
    });

    it("should track pressed keys", async () => {
      const { result } = renderHook(() => useKeyboard());

      expect(result.current.pressedKeys.size).toBe(0);

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA", key: "a" }));
      });

      await waitFor(() => {
        expect(result.current.pressedKeys.has("KeyA")).toBe(true);
        expect(result.current.pressedKeys.has("a")).toBe(true);
      });
    });

    it("should provide isKeyPressed function", async () => {
      const { result } = renderHook(() => useKeyboard());

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA", key: "a" }));
      });

      await waitFor(() => {
        expect(result.current.isKeyPressed("KeyA")).toBe(true);
        expect(result.current.isKeyPressed("KeyB")).toBe(false);
      });
    });

    it("should provide hasActiveKeys state", async () => {
      const { result } = renderHook(() => useKeyboard());

      expect(result.current.hasActiveKeys).toBe(false);

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA", key: "a" }));
      });

      await waitFor(() => {
        expect(result.current.hasActiveKeys).toBe(true);
      });

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyA", key: "a" }));
      });

      await waitFor(() => {
        expect(result.current.hasActiveKeys).toBe(false);
      });
    });

    it("should clear keys on window blur", async () => {
      const { result } = renderHook(() => useKeyboard());

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA", key: "a" }));
      });

      await waitFor(() => {
        expect(result.current.hasActiveKeys).toBe(true);
      });

      act(() => {
        window.dispatchEvent(new Event("blur"));
      });

      await waitFor(() => {
        expect(result.current.hasActiveKeys).toBe(false);
      });
    });
  });

  describe("useInputMethod Hook", () => {
    beforeEach(async () => {
      await inputManager.init();
    });

    it("should track current input method", () => {
      const { result } = renderHook(() => useInputMethod());

      expect(result.current.inputMethod).toBeDefined();
      expect(["keyboard", "mouse", "touch", "gamepad"]).toContain(result.current.inputMethod);
    });

    it("should provide boolean helpers for input type", () => {
      const { result } = renderHook(() => useInputMethod());

      expect(typeof result.current.isTouchInput).toBe("boolean");
      expect(typeof result.current.isKeyboardInput).toBe("boolean");
      expect(typeof result.current.isMouseInput).toBe("boolean");
      expect(typeof result.current.isGamepadInput).toBe("boolean");
    });

    it("should provide lastChangeTime", () => {
      const { result } = renderHook(() => useInputMethod());

      expect(typeof result.current.lastChangeTime).toBe("number");
    });

    it("should switch to keyboard on key press", async () => {
      const { result } = renderHook(() => useInputMethod());

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA" }));
      });

      await waitFor(() => {
        expect(result.current.inputMethod).toBe("keyboard");
        expect(result.current.isKeyboardInput).toBe(true);
      });
    });

    it("should switch to mouse on mouse event", async () => {
      const { result } = renderHook(() => useInputMethod());

      act(() => {
        window.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, clientY: 100 }));
      });

      await waitFor(() => {
        expect(result.current.inputMethod).toBe("mouse");
        expect(result.current.isMouseInput).toBe(true);
      });
    });
  });

  describe("Input Manager Direct Integration", () => {
    beforeEach(async () => {
      await inputManager.init();
    });

    it("should be initialized", () => {
      expect(inputManager.isInitialized()).toBe(true);
    });

    it("should provide current state", () => {
      const state = inputManager.getState();

      expect(state).toHaveProperty("movement");
      expect(state).toHaveProperty("primaryAction");
      expect(state).toHaveProperty("secondaryAction");
      expect(state).toHaveProperty("pause");
      expect(state).toHaveProperty("activeSource");
    });

    it("should handle keyboard movement correctly", () => {
      // Press W for up
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
      expect(inputManager.getMovement().y).toBe(-1);
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));

      // Press D for right
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
      expect(inputManager.getMovement().x).toBe(1);
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyD" }));

      // Release both (already done but for safety)
      expect(inputManager.getMovement()).toEqual({ x: 0, y: 0 });
    });

    it("should normalize diagonal movement", () => {
      // Press W and D together
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));

      const movement = inputManager.getMovement();

      // Should be normalized (magnitude should be ~1)
      const magnitude = Math.sqrt(movement.x * movement.x + movement.y * movement.y);
      expect(magnitude).toBeCloseTo(1, 2);
    });

    it("should track drag state", () => {
      expect(inputManager.isDragging()).toBe(false);

      window.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, clientY: 100 }));
      expect(inputManager.isDragging()).toBe(true);

      window.dispatchEvent(new MouseEvent("mouseup", { clientX: 100, clientY: 100 }));
      expect(inputManager.isDragging()).toBe(false);
    });

    it("should track drag position", () => {
      window.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, clientY: 100 }));

      const pos = inputManager.getDragPosition();
      expect(pos).toEqual({ x: 100, y: 100 });

      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 200, clientY: 150 }));

      const newPos = inputManager.getDragPosition();
      expect(newPos).toEqual({ x: 200, y: 150 });
    });

    it("should calculate drag delta", () => {
      window.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, clientY: 100 }));
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 150, clientY: 200 }));

      const delta = inputManager.getDragDelta();
      expect(delta).toEqual({ x: 50, y: 100 });
    });

    it("should allow setting deadzone for gamepad", () => {
      expect(() => inputManager.setDeadzone(0.2)).not.toThrow();
      expect(() => inputManager.setDeadzone(0)).not.toThrow();
      expect(() => inputManager.setDeadzone(1)).not.toThrow();
    });
  });
});
