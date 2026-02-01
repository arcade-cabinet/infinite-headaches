import { useEffect } from "react";
import { useScene } from "react-babylonjs";
import { MeshBuilder, StandardMaterial, Color3, PBRMaterial } from "@babylonjs/core";
import { QualityLevel } from "../../../graphics";

export const NebraskaGround = ({ quality }: { quality: QualityLevel }) => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;

    // We keep the ground mesh for physics/raycasting but make it nearly invisible
    // so the "floor" of the HDRI dome is visible instead, but it catches shadows.
    const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100, subdivisions: 2 }, scene);
    ground.position.y = 0; // At zero for feet matching

    const groundMaterial = new StandardMaterial("groundMat", scene);
    groundMaterial.alpha = 0.01; // Nearly invisible
    groundMaterial.specularColor = new Color3(0, 0, 0); // No shine
    ground.material = groundMaterial;
    ground.receiveShadows = true;

    return () => {
      ground.dispose();
    };
  }, [scene, quality]);

  return null;
};