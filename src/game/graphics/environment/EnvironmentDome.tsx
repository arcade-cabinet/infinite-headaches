import { useEffect } from "react";
import { useScene } from "reactylon";
import { PhotoDome, Vector3 } from "@babylonjs/core";
import { QualityLevel } from "../../../graphics";

export const EnvironmentDome = ({ quality }: { quality: QualityLevel }) => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;

    // Use the high-quality JPG for the VISUAL dome because browsers/PhotoDome handle it better than raw EXR for the background image
    // The LIGHTING is handled by the EXR in Lighting.tsx
    const dome = new PhotoDome(
      "envDome",
      "/assets/environment/environment_dome.jpg",
      {
        resolution: 64, // Higher resolution for the dome mesh
        size: 1000,
        useDirectMapping: false
      },
      scene
    );
    
    // Rotate to match the EXR lighting rotation (usually they align if exported together)
    // Adjust if the sun in the skybox doesn't match the shadows
    dome.mesh.rotation.y = Math.PI / 1.5; 

    return () => dome.dispose();
  }, [scene]);

  return null;
};