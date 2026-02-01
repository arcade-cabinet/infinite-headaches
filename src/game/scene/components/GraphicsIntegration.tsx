/**
 * GraphicsIntegration - Registers Babylon.js engine and scene with the graphics manager.
 * This enables the graphics settings system to apply quality settings automatically.
 */

import { useCallback, useEffect } from "react";
import { useScene } from "react-babylonjs";
import { Scene as BabylonScene } from "@babylonjs/core";
import { graphicsManager } from "../../../graphics";

export const GraphicsIntegration = () => {
  const scene = useScene();
  const { registerEngine, registerScene } = useGraphicsManagerRegistration();

  useEffect(() => {
    if (scene) {
      const engine = scene.getEngine();
      registerEngine(engine);
      registerScene(scene);
    }
  }, [scene, registerEngine, registerScene]);

  return null;
};

/**
 * Hook to get registration functions from graphicsManager
 * Separated to avoid issues with conditional hook calls
 */
function useGraphicsManagerRegistration() {
  const registerEngine = useCallback((engine: import("@babylonjs/core").AbstractEngine) => {
    // Cast to Engine for graphics manager - AbstractEngine has the methods we need
    graphicsManager.registerEngine(engine as import("@babylonjs/core").Engine);
  }, []);

  const registerScene = useCallback((scene: BabylonScene) => {
    graphicsManager.registerScene(scene);
  }, []);

  return { registerEngine, registerScene };
}
