/**
 * GraphicsIntegration - Registers Babylon.js engine and scene with the graphics manager.
 * This enables the graphics settings system to apply quality settings automatically.
 */

import { useEffect } from "react";
import { useScene } from "reactylon";
import { graphicsManager } from "@/graphics";
import type { Engine, Scene as BabylonScene } from "@babylonjs/core";

export const GraphicsIntegration = () => {
  const scene = useScene();

  useEffect(() => {
    if (scene) {
      const engine = scene.getEngine();
      graphicsManager.registerEngine(engine as Engine);
      graphicsManager.registerScene(scene);
    }
  }, [scene]);

  return null;
};
