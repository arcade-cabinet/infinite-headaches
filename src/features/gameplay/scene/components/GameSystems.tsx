/**
 * GameSystems - Bridges the ECS AnimationSystem into the Babylon.js render loop.
 * The AnimationSystem needs per-frame deltaTime to drive velocity-based animation
 * selection and blending for all entities with animation components.
 */

import { useEffect, useRef } from "react";
import { useScene } from "reactylon";
import { AnimationSystem } from "@/game/ecs/systems/AnimationSystem";

export const GameSystems = () => {
  const scene = useScene();
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!scene) return;

    lastTimeRef.current = performance.now();

    const observer = scene.onBeforeRenderObservable.add(() => {
      const now = performance.now();
      const deltaTime = (now - lastTimeRef.current) / 1000; // Convert ms to seconds
      lastTimeRef.current = now;

      // Clamp deltaTime to avoid huge jumps on tab switch / focus loss
      const clampedDelta = Math.min(deltaTime, 0.1);

      AnimationSystem(clampedDelta);
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
    };
  }, [scene]);

  return null;
};
