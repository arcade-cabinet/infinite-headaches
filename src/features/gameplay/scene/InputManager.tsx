/**
 * InputManager - Handles all input via Babylon.js pointer observables
 * Replaces the legacy 2D canvas input handlers
 */

import { useEffect, useRef, useCallback } from "react";
import { useScene } from "reactylon";
import { Vector3, PointerEventTypes } from "@babylonjs/core";

export interface InputCallbacks {
  onDragStart: (worldX: number, screenX: number) => void;
  onDrag: (worldX: number, screenX: number, deltaX: number) => void;
  onDragEnd: () => void;
  onTap?: (worldX: number, worldY: number) => void;
}

interface InputState {
  isDragging: boolean;
  lastScreenX: number;
  lastWorldX: number;
  startTime: number;
  startX: number;
}

/**
 * Maps screen X coordinate to world X coordinate
 * The game uses a fixed-width play area centered at 0
 */
function screenToWorldX(screenX: number, canvasWidth: number): number {
  // Map screen space to world space
  // Assuming visible width is ~20 units (-10 to +10)
  const visibleWidth = 20;
  const normalizedX = (screenX / canvasWidth) - 0.5; // -0.5 to 0.5
  return normalizedX * visibleWidth;
}

/**
 * InputManager component - renders nothing, just handles input
 */
export const InputManager = ({
  onDragStart,
  onDrag,
  onDragEnd,
  onTap,
  enabled = true,
}: InputCallbacks & { enabled?: boolean }) => {
  const scene = useScene();
  const stateRef = useRef<InputState>({
    isDragging: false,
    lastScreenX: 0,
    lastWorldX: 0,
    startTime: 0,
    startX: 0,
  });

  const handlePointerDown = useCallback(
    (screenX: number, _screenY: number) => {
      if (!enabled || !scene) return;

      const canvas = scene.getEngine().getRenderingCanvas();
      if (!canvas) return;

      const worldX = screenToWorldX(screenX, canvas.width);

      stateRef.current = {
        isDragging: true,
        lastScreenX: screenX,
        lastWorldX: worldX,
        startTime: Date.now(),
        startX: screenX,
      };

      onDragStart(worldX, screenX);
    },
    [enabled, scene, onDragStart]
  );

  const handlePointerMove = useCallback(
    (screenX: number, _screenY: number) => {
      if (!enabled || !scene || !stateRef.current.isDragging) return;

      const canvas = scene.getEngine().getRenderingCanvas();
      if (!canvas) return;

      const worldX = screenToWorldX(screenX, canvas.width);
      const deltaX = screenX - stateRef.current.lastScreenX;

      stateRef.current.lastScreenX = screenX;
      stateRef.current.lastWorldX = worldX;

      onDrag(worldX, screenX, deltaX);
    },
    [enabled, scene, onDrag]
  );

  const handlePointerUp = useCallback(
    (screenX: number, screenY: number) => {
      if (!enabled) return;

      const wasShortTap =
        Date.now() - stateRef.current.startTime < 200 &&
        Math.abs(screenX - stateRef.current.startX) < 10;

      if (wasShortTap && onTap && scene) {
        const canvas = scene.getEngine().getRenderingCanvas();
        if (canvas) {
          const worldX = screenToWorldX(screenX, canvas.width);
          // For Y, use similar mapping (visible height ~10 units)
          const visibleHeight = 10;
          const normalizedY = (screenY / canvas.height) - 0.5;
          const worldY = -normalizedY * visibleHeight + 5; // Offset to match camera
          onTap(worldX, worldY);
        }
      }

      stateRef.current.isDragging = false;
      onDragEnd();
    },
    [enabled, scene, onTap, onDragEnd]
  );

  // Set up Babylon.js pointer observables
  useEffect(() => {
    if (!scene || !enabled) return;

    const observer = scene.onPointerObservable.add((pointerInfo) => {
      const { event } = pointerInfo;

      // Get coordinates from the event
      const screenX = event.clientX;
      const screenY = event.clientY;

      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN:
          handlePointerDown(screenX, screenY);
          break;

        case PointerEventTypes.POINTERMOVE:
          handlePointerMove(screenX, screenY);
          break;

        case PointerEventTypes.POINTERUP:
          handlePointerUp(screenX, screenY);
          break;
      }
    });

    return () => {
      scene.onPointerObservable.remove(observer);
    };
  }, [scene, enabled, handlePointerDown, handlePointerMove, handlePointerUp]);

  return null;
};

export default InputManager;
