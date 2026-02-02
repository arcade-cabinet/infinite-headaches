import { useEffect } from "react";
import { useScene } from "reactylon";
import {
  MeshBuilder,
  StandardMaterial,
  Mesh,
  Color3,
  PhotoDome
} from "@babylonjs/core";

import { QualityLevel } from "../../../graphics";

export const CartoonSky = ({ quality }: { quality: QualityLevel }) => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;

    if (quality === "low") {
      const sky = MeshBuilder.CreateSphere("sky", { diameter: 500, sideOrientation: Mesh.BACKSIDE }, scene);
      sky.position.y = -50;
      const mat = new StandardMaterial("skyMat", scene);
      mat.disableLighting = true;
      mat.emissiveColor = new Color3(0.4, 0.7, 1.0); // Bright sky blue
      sky.material = mat;
      return () => sky.dispose();
    } else {
      // Photo sky for medium/high
      const dome = new PhotoDome("skyDome", "/assets/environment/sky.jpg", { resolution: 32, size: 1000 }, scene);
      const mat = dome.mesh.material as StandardMaterial;
      if (mat) {
        mat.emissiveColor = new Color3(1, 1, 1);
      }
      return () => dome.dispose();
    }
  }, [scene, quality]);

  return null;
};