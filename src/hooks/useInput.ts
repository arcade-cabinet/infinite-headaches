/**
 * useInput Hook
 * React hooks for subscribing to the unified input system
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  inputManager,
  type InputSource,
  type InputDirection,
  type InputState,
  type DragEventData,
} from "../platform/input";

export interface UseInputOptions {
  /** Called when movement direction changes (keyboard WASD/Arrows or gamepad) */
  onMove?: (direction: InputDirection) => void;
  /** Called when drag/touch starts */
  onDragStart?: (position: { x: number; y: number }) => void;
  /** Called during drag/touch movement */
  onDrag?: (position: { x: number; y: number }, delta: { x: number; y: number }) => void;
  /** Called when drag/touch ends */
  onDragEnd?: (position: { x: number; y: number }) => void;
  /** Called when pause key/button is pressed */
  onPause?: () => void;
  /** Called when primary action key/button is pressed */
  onAction?: () => void;
  /** Called when secondary action key/button is pressed */
  onSecondaryAction?: () => void;
  /** Called on tap (touch) or click (mouse) */
  onTap?: (position: { x: number; y: number }) => void;
  /** Called on any input change */
  onInput?: (state: InputState) => void;
  /** Whether to enable input handling (defaults to true) */
  enabled?: boolean;
}

/**
 * Hook for subscribing to unified input events
 * Provides access to keyboard, mouse, touch, and gamepad input
 */
export function useInput(options: UseInputOptions = {}) {
  const [activeSource, setActiveSource] = useState<InputSource>("keyboard");
  const [isUsingTouch, setIsUsingTouch] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Use refs to avoid stale closures in event callbacks
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const enabled = options.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;

    // Initialize input manager
    inputManager.init();

    const unsubscribers: (() => void)[] = [];

    // Subscribe to input events
    unsubscribers.push(
      inputManager.on("input", (state: InputState) => {
        setActiveSource(state.activeSource);
        setIsUsingTouch(state.activeSource === "touch");

        // Call onMove for keyboard/gamepad movement
        if (
          optionsRef.current.onMove &&
          (state.movement.x !== 0 || state.movement.y !== 0)
        ) {
          optionsRef.current.onMove(state.movement);
        }

        optionsRef.current.onInput?.(state);
      })
    );

    // Drag start
    unsubscribers.push(
      inputManager.on<DragEventData>("dragstart", (data) => {
        setIsDragging(true);
        optionsRef.current.onDragStart?.(data.position);
      })
    );

    // Drag move
    unsubscribers.push(
      inputManager.on<DragEventData>("drag", (data) => {
        if (data.delta) {
          optionsRef.current.onDrag?.(data.position, data.delta);
        }
      })
    );

    // Drag end
    unsubscribers.push(
      inputManager.on<DragEventData>("dragend", (data) => {
        setIsDragging(false);
        optionsRef.current.onDragEnd?.(data.position);
      })
    );

    // Pause
    unsubscribers.push(
      inputManager.on("pause", () => {
        optionsRef.current.onPause?.();
      })
    );

    // Primary action
    unsubscribers.push(
      inputManager.on("action", () => {
        optionsRef.current.onAction?.();
      })
    );

    // Secondary action
    unsubscribers.push(
      inputManager.on("secondaryAction", () => {
        optionsRef.current.onSecondaryAction?.();
      })
    );

    // Tap (touch) and click (mouse)
    unsubscribers.push(
      inputManager.on<DragEventData>("tap", (data) => {
        optionsRef.current.onTap?.(data.position);
      })
    );
    unsubscribers.push(
      inputManager.on<DragEventData & { button: number }>("click", (data) => {
        if (data.button === 0) {
          optionsRef.current.onTap?.(data.position);
        }
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [enabled]);

  return {
    /** Currently active input source */
    activeSource,
    /** Whether touch input is being used */
    isUsingTouch,
    /** Whether keyboard input is being used */
    isUsingKeyboard: activeSource === "keyboard",
    /** Whether mouse input is being used */
    isUsingMouse: activeSource === "mouse",
    /** Whether gamepad input is being used */
    isUsingGamepad: activeSource === "gamepad",
    /** Whether currently dragging */
    isDragging,
    /** Get current input state */
    getState: inputManager.getState.bind(inputManager),
    /** Get current movement direction */
    getMovement: inputManager.getMovement.bind(inputManager),
  };
}

/**
 * Hook for reading movement direction (keyboard WASD/Arrows or gamepad)
 * Updates at 60fps when movement is active
 */
export function useGameControls() {
  const [movement, setMovement] = useState<InputDirection>({ x: 0, y: 0 });
  const [isPrimaryAction, setIsPrimaryAction] = useState(false);
  const [isSecondaryAction, setIsSecondaryAction] = useState(false);

  useEffect(() => {
    inputManager.init();

    const unsub = inputManager.on("input", (state: InputState) => {
      setMovement(state.movement);
      setIsPrimaryAction(state.primaryAction);
      setIsSecondaryAction(state.secondaryAction);
    });

    return unsub;
  }, []);

  return {
    /** Current movement direction (-1 to 1 for x and y) */
    movement,
    /** X movement (-1 = left, 0 = none, 1 = right) */
    x: movement.x,
    /** Y movement (-1 = up, 0 = none, 1 = down) */
    y: movement.y,
    /** Whether primary action button/key is held */
    isPrimaryAction,
    /** Whether secondary action button/key is held */
    isSecondaryAction,
    /** Whether any movement is happening */
    isMoving: movement.x !== 0 || movement.y !== 0,
  };
}

/**
 * Hook for drag/touch input
 * Useful for implementing touch controls, drag gestures, etc.
 */
export function useDrag(
  onDrag?: (delta: { x: number; y: number }, position: { x: number; y: number }) => void,
  options: { enabled?: boolean } = {}
) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const onDragRef = useRef(onDrag);
  onDragRef.current = onDrag;

  const enabled = options.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;

    inputManager.init();

    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(
      inputManager.on<DragEventData>("dragstart", (data) => {
        setIsDragging(true);
        setDragStart(data.position);
        setDragPosition(data.position);
        setDragDelta({ x: 0, y: 0 });
      })
    );

    unsubscribers.push(
      inputManager.on<DragEventData>("drag", (data) => {
        setDragPosition(data.position);
        if (data.delta) {
          setDragDelta(data.delta);
          onDragRef.current?.(data.delta, data.position);
        }
      })
    );

    unsubscribers.push(
      inputManager.on<DragEventData>("dragend", () => {
        setIsDragging(false);
        setDragStart(null);
        setDragPosition(null);
        setDragDelta({ x: 0, y: 0 });
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [enabled]);

  return {
    /** Whether currently dragging */
    isDragging,
    /** Position where drag started */
    dragStart,
    /** Current drag position */
    dragPosition,
    /** Distance dragged from start */
    dragDelta,
  };
}

/**
 * Hook for tracking keyboard state
 */
export function useKeyboard() {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    inputManager.init();

    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(
      inputManager.on<InputState & { key: string; code: string }>("keydown", (data) => {
        setPressedKeys((prev) => new Set([...prev, data.key, data.code]));
      })
    );

    unsubscribers.push(
      inputManager.on<InputState & { key: string; code: string }>("keyup", (data) => {
        setPressedKeys((prev) => {
          const next = new Set(prev);
          next.delete(data.key);
          next.delete(data.code);
          return next;
        });
      })
    );

    unsubscribers.push(
      inputManager.on("blur", () => {
        setPressedKeys(new Set());
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  const isKeyPressed = useCallback(
    (key: string) => pressedKeys.has(key),
    [pressedKeys]
  );

  return {
    /** Set of currently pressed keys */
    pressedKeys,
    /** Check if a specific key is pressed */
    isKeyPressed,
    /** Whether any key is currently pressed */
    hasActiveKeys: pressedKeys.size > 0,
  };
}

/**
 * Hook for detecting input method changes
 * Useful for showing/hiding touch controls based on input method
 */
export function useInputMethod() {
  const [inputMethod, setInputMethod] = useState<InputSource>("keyboard");
  const [lastChangeTime, setLastChangeTime] = useState(Date.now());

  useEffect(() => {
    inputManager.init();

    const unsub = inputManager.on("input", (state: InputState) => {
      if (state.activeSource !== inputMethod) {
        setInputMethod(state.activeSource);
        setLastChangeTime(Date.now());
      }
    });

    return unsub;
  }, [inputMethod]);

  return {
    /** Current input method */
    inputMethod,
    /** Whether using touch controls */
    isTouchInput: inputMethod === "touch",
    /** Whether using keyboard controls */
    isKeyboardInput: inputMethod === "keyboard",
    /** Whether using mouse controls */
    isMouseInput: inputMethod === "mouse",
    /** Whether using gamepad controls */
    isGamepadInput: inputMethod === "gamepad",
    /** Timestamp of last input method change */
    lastChangeTime,
    /** Whether user prefers touch (useful for showing virtual controls) */
    prefersTouchControls: inputMethod === "touch",
  };
}

/**
 * Hook that polls input state at regular intervals
 * Useful for game loops that need continuous input reading
 */
export function useInputPolling(intervalMs = 16) {
  const [state, setState] = useState<InputState>(inputManager.getState());

  useEffect(() => {
    inputManager.init();

    const interval = setInterval(() => {
      setState(inputManager.getState());
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return state;
}
