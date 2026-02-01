/**
 * GameSystems - Runs ECS systems within the Babylon.js render loop.
 * Hooks into the Babylon render loop to run movement, wobble, and animation systems.
 */

import { useEffect } from "react";
import { useScene } from "react-babylonjs";
import { MovementSystem } from "../../ecs/systems/MovementSystem";
import { WobbleSystem } from "../../ecs/systems/WobbleSystem";
import { AnimationSystem } from "../../ecs/systems/AnimationSystem";

export const GameSystems = () => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;

    // Hook into the Babylon render loop to run ECS systems
    // NOTE: Systems are now run by GameLogic.ts loop to ensure determinism and decoupling.
    // We do NOT run them here to avoid double-updates.
    /*
    const observer = scene.onBeforeRenderObservable.add(() => {
      const deltaTime = scene.getEngine().getDeltaTime() / 1000;

      // Run all ECS systems
      MovementSystem(deltaTime);
      WobbleSystem(deltaTime);
      AnimationSystem(deltaTime);
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
    };
    */
  }, [scene]);

  return null;
};
