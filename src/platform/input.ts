/**
 * Unified Input System
 * Handles keyboard, mouse, and touch input across all platforms
 * Supports WASD + Arrow keys for keyboard, click/drag for mouse, and touch for mobile
 */

import { Capacitor } from "@capacitor/core";
import {
  getKeyBindings,
  loadKeyBindings,
  type KeyBindings,
} from "./keybindings";
import { storage, STORAGE_KEYS } from "./storage";

export type InputSource = "keyboard" | "mouse" | "touch" | "gamepad";

export interface MotorSettings {
  inputSensitivity: number; // 0.5 - 2.0
  oneHandedMode: boolean;
}

export type InputDirection = {
  x: number;
  y: number;
};

export interface InputState {
  movement: InputDirection;
  primaryAction: boolean;
  secondaryAction: boolean;
  pause: boolean;
  activeSource: InputSource;
}

export interface DragEventData extends InputState {
  position: { x: number; y: number };
  delta?: { x: number; y: number };
}

type InputEventCallback<T = InputState> = (state: T) => void;

// One-handed mode key mirrors: J/K/L → left/action/right
const ONE_HANDED_MIRRORS: Record<string, { action: string; code: string }> = {
  KeyJ: { action: "moveLeft", code: "KeyJ" },
  KeyK: { action: "bank", code: "KeyK" },
  KeyL: { action: "moveRight", code: "KeyL" },
};

/**
 * Build currentKeyMappings from dynamic KeyBindings.
 * Maps the semantic actions to the format used internally.
 */
function buildKeyMappings(bindings: KeyBindings, oneHanded: boolean) {
  const left = [...bindings.moveLeft];
  const right = [...bindings.moveRight];
  const action = [...bindings.bank];
  const pause = [...bindings.pause];
  const secondaryAction = [...bindings.fireAbility];

  if (oneHanded) {
    left.push("KeyJ");
    action.push("KeyK");
    right.push("KeyL");
  }

  return {
    left,
    right,
    up: [] as string[],
    down: [] as string[],
    pause,
    action,
    secondaryAction,
  };
}

let currentKeyMappings = buildKeyMappings(getKeyBindings(), false);

/**
 * InputManager - Singleton class for handling all input across platforms
 */
class InputManager {
  private state: InputState = {
    movement: { x: 0, y: 0 },
    primaryAction: false,
    secondaryAction: false,
    pause: false,
    activeSource: "keyboard",
  };

  private keysPressed = new Set<string>();
  private touchStartPos: { x: number; y: number } | null = null;
  private currentTouchPos: { x: number; y: number } | null = null;
  private dragStartPos: { x: number; y: number } | null = null;
  private listeners = new Map<string, Set<InputEventCallback<unknown>>>();
  private initialized = false;
  private gamepadIndex: number | null = null;
  private gamepadPollInterval: number | null = null;
  private deadzone = 0.15; // Gamepad stick deadzone
  private motorSettings: MotorSettings = { inputSensitivity: 1.0, oneHandedMode: false };

  /**
   * Initialize the input system
   * Sets up event listeners for keyboard, mouse, and touch
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Keyboard events
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);

    // Mouse events (desktop)
    window.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener("contextmenu", this.handleContextMenu);

    // Touch events (mobile/tablet)
    window.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    window.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    window.addEventListener("touchend", this.handleTouchEnd);
    window.addEventListener("touchcancel", this.handleTouchEnd);

    // Gamepad events
    window.addEventListener("gamepadconnected", this.handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", this.handleGamepadDisconnected);

    // Check for already connected gamepads
    this.checkForGamepads();

    // Blur event to reset keys when window loses focus
    window.addEventListener("blur", this.handleBlur);

    // Load dynamic key bindings and motor settings
    const bindings = await loadKeyBindings();
    const motorStored = await storage.get<MotorSettings>(STORAGE_KEYS.MOTOR_SETTINGS);
    if (motorStored) {
      this.motorSettings = motorStored;
    }
    currentKeyMappings = buildKeyMappings(bindings, this.motorSettings.oneHandedMode);

    this.initialized = true;
    console.log(`[Input] Initialized on ${Capacitor.getPlatform()} platform`);
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("contextmenu", this.handleContextMenu);
    window.removeEventListener("touchstart", this.handleTouchStart);
    window.removeEventListener("touchmove", this.handleTouchMove);
    window.removeEventListener("touchend", this.handleTouchEnd);
    window.removeEventListener("touchcancel", this.handleTouchEnd);
    window.removeEventListener("gamepadconnected", this.handleGamepadConnected);
    window.removeEventListener("gamepaddisconnected", this.handleGamepadDisconnected);
    window.removeEventListener("blur", this.handleBlur);

    if (this.gamepadPollInterval !== null) {
      window.clearInterval(this.gamepadPollInterval);
      this.gamepadPollInterval = null;
    }

    this.listeners.clear();
    this.keysPressed.clear();
    this.touchStartPos = null;
    this.currentTouchPos = null;
    this.dragStartPos = null;
    this.gamepadIndex = null;
    this.state = {
      movement: { x: 0, y: 0 },
      primaryAction: false,
      secondaryAction: false,
      pause: false,
      activeSource: "keyboard",
    };
    this.initialized = false;
    console.log("[Input] Destroyed");
  }

  // ============================================
  // Keyboard Handlers
  // ============================================

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Ignore repeated key events (key held down)
    if (e.repeat) return;

    // Don't capture input when typing in form fields
    if (this.isInputElement(e.target)) return;

    this.keysPressed.add(e.code);
    this.keysPressed.add(e.key);
    this.state.activeSource = "keyboard";
    this.updateMovementFromKeys();

    // Check for pause
    if (currentKeyMappings.pause.some((k) => k === e.code || k === e.key)) {
      this.state.pause = true;
      this.emit("pause", this.state);
    }

    // Check for primary action
    if (currentKeyMappings.action.some((k) => k === e.code || k === e.key)) {
      this.state.primaryAction = true;
      this.emit("action", this.state);
    }

    // Check for secondary action
    if (currentKeyMappings.secondaryAction.some((k) => k === e.code || k === e.key)) {
      this.state.secondaryAction = true;
      this.emit("secondaryAction", this.state);
    }

    this.emit("input", this.state);
    this.emit("keydown", { ...this.state, key: e.key, code: e.code });
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (this.isInputElement(e.target)) return;

    this.keysPressed.delete(e.code);
    this.keysPressed.delete(e.key);
    this.updateMovementFromKeys();

    if (currentKeyMappings.pause.some((k) => k === e.code || k === e.key)) {
      this.state.pause = false;
    }
    if (currentKeyMappings.action.some((k) => k === e.code || k === e.key)) {
      this.state.primaryAction = false;
    }
    if (currentKeyMappings.secondaryAction.some((k) => k === e.code || k === e.key)) {
      this.state.secondaryAction = false;
    }

    this.emit("input", this.state);
    this.emit("keyup", { ...this.state, key: e.key, code: e.code });
  };

  private updateMovementFromKeys(): void {
    let x = 0;
    let y = 0;

    if (currentKeyMappings.left.some((k) => this.keysPressed.has(k))) x -= 1;
    if (currentKeyMappings.right.some((k) => this.keysPressed.has(k))) x += 1;
    if (currentKeyMappings.up.some((k) => this.keysPressed.has(k))) y -= 1;
    if (currentKeyMappings.down.some((k) => this.keysPressed.has(k))) y += 1;

    // Normalize diagonal movement to prevent faster diagonal speed
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }

    this.state.movement = { x, y };
  }

  private isInputElement(target: EventTarget | null): boolean {
    if (!target) return false;
    const element = target as HTMLElement;
    const tagName = element.tagName?.toLowerCase();
    return (
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      element.isContentEditable
    );
  }

  // ============================================
  // Mouse Handlers
  // ============================================

  private handleMouseDown = (e: MouseEvent): void => {
    const position = { x: e.clientX, y: e.clientY };
    this.touchStartPos = position;
    this.dragStartPos = position;
    this.currentTouchPos = position;
    this.state.activeSource = "mouse";
    this.state.primaryAction = e.button === 0;
    this.state.secondaryAction = e.button === 2;

    const eventData: DragEventData = {
      ...this.state,
      position,
    };
    this.emit("dragstart", eventData);
    this.emit("input", this.state);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const position = { x: e.clientX, y: e.clientY };

    if (this.dragStartPos) {
      this.currentTouchPos = position;
      const delta = {
        x: position.x - this.dragStartPos.x,
        y: position.y - this.dragStartPos.y,
      };

      const eventData: DragEventData = {
        ...this.state,
        position,
        delta,
      };
      this.emit("drag", eventData);
    }

    // Always emit mousemove for hover effects
    this.emit("mousemove", { ...this.state, position });
  };

  private handleMouseUp = (e: MouseEvent): void => {
    const position = { x: e.clientX, y: e.clientY };

    if (this.dragStartPos) {
      const delta = {
        x: position.x - this.dragStartPos.x,
        y: position.y - this.dragStartPos.y,
      };

      const eventData: DragEventData = {
        ...this.state,
        position,
        delta,
      };
      this.emit("dragend", eventData);

      // Detect click (minimal drag distance)
      const dragDistance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
      if (dragDistance < 10) {
        this.emit("click", { ...this.state, position, button: e.button });
      }
    }

    this.touchStartPos = null;
    this.dragStartPos = null;
    this.currentTouchPos = null;
    this.state.primaryAction = false;
    this.state.secondaryAction = false;
    this.emit("input", this.state);
  };

  private handleContextMenu = (e: MouseEvent): void => {
    // Prevent context menu in game area
    if (!this.isInputElement(e.target)) {
      e.preventDefault();
    }
  };

  // ============================================
  // Touch Handlers
  // ============================================

  private handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const position = { x: touch.clientX, y: touch.clientY };
      this.touchStartPos = position;
      this.dragStartPos = position;
      this.currentTouchPos = position;
      this.state.activeSource = "touch";
      this.state.primaryAction = true;

      const eventData: DragEventData = {
        ...this.state,
        position,
      };
      this.emit("dragstart", eventData);
      this.emit("touchstart", eventData);
      this.emit("input", this.state);
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (e.touches.length > 0 && this.dragStartPos) {
      // Prevent scrolling while dragging in game
      e.preventDefault();

      const touch = e.touches[0];
      const position = { x: touch.clientX, y: touch.clientY };
      this.currentTouchPos = position;

      const delta = {
        x: position.x - this.dragStartPos.x,
        y: position.y - this.dragStartPos.y,
      };

      const eventData: DragEventData = {
        ...this.state,
        position,
        delta,
      };
      this.emit("drag", eventData);
      this.emit("touchmove", eventData);
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    if (this.dragStartPos && this.currentTouchPos) {
      const position = this.currentTouchPos;
      const delta = {
        x: position.x - this.dragStartPos.x,
        y: position.y - this.dragStartPos.y,
      };

      const eventData: DragEventData = {
        ...this.state,
        position,
        delta,
      };
      this.emit("dragend", eventData);
      this.emit("touchend", eventData);

      // Detect tap (minimal drag distance)
      const dragDistance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
      if (dragDistance < 10) {
        this.emit("tap", { ...this.state, position });
      }
    }

    this.touchStartPos = null;
    this.dragStartPos = null;
    this.currentTouchPos = null;
    this.state.primaryAction = false;
    this.emit("input", this.state);
  };

  // ============================================
  // Gamepad Handlers
  // ============================================

  private handleGamepadConnected = (e: GamepadEvent): void => {
    console.log(`[Input] Gamepad connected: ${e.gamepad.id}`);
    this.gamepadIndex = e.gamepad.index;
    this.startGamepadPolling();
  };

  private handleGamepadDisconnected = (e: GamepadEvent): void => {
    console.log(`[Input] Gamepad disconnected: ${e.gamepad.id}`);
    if (this.gamepadIndex === e.gamepad.index) {
      this.gamepadIndex = null;
      this.stopGamepadPolling();
    }
  };

  private checkForGamepads(): void {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.gamepadIndex = i;
        this.startGamepadPolling();
        break;
      }
    }
  }

  private startGamepadPolling(): void {
    if (this.gamepadPollInterval !== null) return;

    this.gamepadPollInterval = window.setInterval(() => {
      this.pollGamepad();
    }, 16); // ~60fps
  }

  private stopGamepadPolling(): void {
    if (this.gamepadPollInterval !== null) {
      window.clearInterval(this.gamepadPollInterval);
      this.gamepadPollInterval = null;
    }
  }

  private pollGamepad(): void {
    if (this.gamepadIndex === null) return;

    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[this.gamepadIndex];
    if (!gamepad) return;

    // Left stick for movement
    let x = gamepad.axes[0] ?? 0;
    let y = gamepad.axes[1] ?? 0;

    // Apply deadzone
    if (Math.abs(x) < this.deadzone) x = 0;
    if (Math.abs(y) < this.deadzone) y = 0;

    // D-pad fallback (buttons 12-15: up, down, left, right)
    if (x === 0 && y === 0) {
      if (gamepad.buttons[12]?.pressed) y = -1; // Up
      if (gamepad.buttons[13]?.pressed) y = 1; // Down
      if (gamepad.buttons[14]?.pressed) x = -1; // Left
      if (gamepad.buttons[15]?.pressed) x = 1; // Right
    }

    const hasMovement = x !== 0 || y !== 0;
    const hadMovement = this.state.movement.x !== 0 || this.state.movement.y !== 0;

    if (hasMovement || hadMovement) {
      this.state.movement = { x, y };
      this.state.activeSource = "gamepad";
    }

    // A button (index 0) for primary action
    const aPressed = gamepad.buttons[0]?.pressed ?? false;
    if (aPressed !== this.state.primaryAction) {
      this.state.primaryAction = aPressed;
      if (aPressed) {
        this.emit("action", this.state);
      }
    }

    // B button (index 1) for secondary action
    const bPressed = gamepad.buttons[1]?.pressed ?? false;
    if (bPressed !== this.state.secondaryAction) {
      this.state.secondaryAction = bPressed;
      if (bPressed) {
        this.emit("secondaryAction", this.state);
      }
    }

    // Start button (index 9) for pause
    const startPressed = gamepad.buttons[9]?.pressed ?? false;
    if (startPressed && !this.state.pause) {
      this.state.pause = true;
      this.emit("pause", this.state);
    } else if (!startPressed && this.state.pause && this.state.activeSource === "gamepad") {
      this.state.pause = false;
    }

    if (hasMovement || hadMovement) {
      this.emit("input", this.state);
    }
  }

  // ============================================
  // Blur Handler
  // ============================================

  private handleBlur = (): void => {
    // Reset all input state when window loses focus
    this.keysPressed.clear();
    this.state.movement = { x: 0, y: 0 };
    this.state.primaryAction = false;
    this.state.secondaryAction = false;
    this.touchStartPos = null;
    this.dragStartPos = null;
    this.currentTouchPos = null;
    this.emit("blur", this.state);
    this.emit("input", this.state);
  };

  // ============================================
  // Event System
  // ============================================

  /**
   * Subscribe to an input event
   * @param event - Event name (input, dragstart, drag, dragend, pause, action, etc.)
   * @param callback - Function to call when event fires
   * @returns Unsubscribe function
   */
  on<T = InputState>(event: string, callback: InputEventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as InputEventCallback<unknown>);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as InputEventCallback<unknown>);
    };
  }

  /**
   * Subscribe to an event for one occurrence only
   */
  once<T = InputState>(event: string, callback: InputEventCallback<T>): () => void {
    const wrapper: InputEventCallback<T> = (state) => {
      this.listeners.get(event)?.delete(wrapper as InputEventCallback<unknown>);
      callback(state);
    };

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(wrapper as InputEventCallback<unknown>);

    return () => {
      this.listeners.get(event)?.delete(wrapper as InputEventCallback<unknown>);
    };
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Get current input state
   */
  getState(): InputState {
    return { ...this.state };
  }

  /**
   * Get current movement direction (with sensitivity applied)
   */
  getMovement(): InputDirection {
    const s = this.motorSettings.inputSensitivity;
    return {
      x: this.state.movement.x * s,
      y: this.state.movement.y * s,
    };
  }

  /**
   * Get currently active input source
   */
  getActiveSource(): InputSource {
    return this.state.activeSource;
  }

  /**
   * Check if currently using touch input
   */
  isUsingTouch(): boolean {
    return this.state.activeSource === "touch";
  }

  /**
   * Check if currently using keyboard input
   */
  isUsingKeyboard(): boolean {
    return this.state.activeSource === "keyboard";
  }

  /**
   * Check if currently using mouse input
   */
  isUsingMouse(): boolean {
    return this.state.activeSource === "mouse";
  }

  /**
   * Check if currently using gamepad input
   */
  isUsingGamepad(): boolean {
    return this.state.activeSource === "gamepad";
  }

  /**
   * Check if a specific key is currently pressed
   */
  isKeyPressed(key: string): boolean {
    return this.keysPressed.has(key);
  }

  /**
   * Check if primary action is active
   */
  isPrimaryActionActive(): boolean {
    return this.state.primaryAction;
  }

  /**
   * Check if secondary action is active
   */
  isSecondaryActionActive(): boolean {
    return this.state.secondaryAction;
  }

  /**
   * Check if input system is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Set gamepad deadzone (0.0 - 1.0)
   */
  setDeadzone(value: number): void {
    this.deadzone = Math.max(0, Math.min(1, value));
  }

  /**
   * Get current drag/touch position if dragging
   */
  getDragPosition(): { x: number; y: number } | null {
    return this.currentTouchPos ? { ...this.currentTouchPos } : null;
  }

  /**
   * Get drag delta from start position
   */
  getDragDelta(): { x: number; y: number } | null {
    if (!this.dragStartPos || !this.currentTouchPos) return null;
    return {
      x: this.currentTouchPos.x - this.dragStartPos.x,
      y: this.currentTouchPos.y - this.dragStartPos.y,
    };
  }

  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.dragStartPos !== null;
  }

  /**
   * Update key bindings at runtime (called from settings UI)
   */
  updateKeyBindings(bindings: KeyBindings): void {
    currentKeyMappings = buildKeyMappings(bindings, this.motorSettings.oneHandedMode);
  }

  /**
   * Update motor accessibility settings at runtime
   */
  async updateMotorSettings(settings: MotorSettings): Promise<void> {
    this.motorSettings = { ...settings };
    currentKeyMappings = buildKeyMappings(getKeyBindings(), settings.oneHandedMode);
    await storage.set(STORAGE_KEYS.MOTOR_SETTINGS, this.motorSettings);
  }

  /**
   * Get current motor settings
   */
  getMotorSettings(): MotorSettings {
    return { ...this.motorSettings };
  }

  /**
   * Get the current resolved key mappings (for external consumers like useGameLogic)
   */
  getKeyMappings() {
    return currentKeyMappings;
  }
}

// Export singleton instance
export const inputManager = new InputManager();
