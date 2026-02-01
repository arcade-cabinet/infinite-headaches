/**
 * GameSystems - Runs ECS systems within the Babylon.js render loop.
 * Hooks into the Babylon render loop to run movement, wobble, and animation systems.
 */

import { useEffect, useRef } from "react";
import { useScene } from "reactylon";
import { Vector3, Color3, StandardMaterial, Texture, MeshBuilder } from "@babylonjs/core";
import { WobbleSystem } from "@/game/ecs/systems/WobbleSystem";
import { AnimationSystem } from "@/game/ecs/systems/AnimationSystem";

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
