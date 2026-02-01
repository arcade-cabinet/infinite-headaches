/**
 * PBREnvironmentSetup - Creates a default environment for PBR materials.
 * PBR materials require an environment texture for proper lighting/reflections.
 * This sets up a simple environment that works for the arcade game style.
 */

import { useEffect } from "react";
import { useScene } from "react-babylonjs";

export const PBREnvironmentSetup = () => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;

    // Create a default environment helper which sets up:
    // - Environment texture for PBR reflections
    // - Ground (we'll hide it since we have our own)
    // - Skybox (we'll hide it since we have our own)
    const envHelper = scene.createDefaultEnvironment({
      createGround: false,
      createSkybox: false,
      // Use a neutral environment for the arcade game style
      environmentTexture: undefined, // Use Babylon's default
    });

    // If no environment texture was created, Babylon will use a default one
    // This ensures PBR materials have something to work with
    console.log("[PBREnvironmentSetup] Environment created:", {
      hasEnvTexture: !!scene.environmentTexture,
    });

    return () => {
      if (envHelper) {
        envHelper.dispose();
      }
    };
  }, [scene]);

  return null;
};
