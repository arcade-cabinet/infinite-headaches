/**
 * FarmerTrack - Visible dirt/grass track at the bottom of the game area
 * where the farmer walks left and right to catch falling animals.
 *
 * Positioned at Y=-2 to Y=-3 (farmer walks at Y=-2), spanning the playable width.
 */

import { useEffect, useRef } from "react";
import { useScene } from "reactylon";
import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  Vector3,
} from "@babylonjs/core";
import { PLAYER_RAIL_CONFIG, getRailWidth, getRailY } from "@/game/rails";

export const FarmerTrack = () => {
  const scene = useScene();
  const meshRef = useRef<Mesh | null>(null);

  useEffect(() => {
    if (!scene) return;

    // Derive track dimensions from rail config
    const railWidth = getRailWidth(PLAYER_RAIL_CONFIG);
    const railY = getRailY(PLAYER_RAIL_CONFIG);
    const trackWidth = railWidth + 2; // 2 units wider than playable area for visual margin

    // Create the dirt track as a wide, flat box
    const track = MeshBuilder.CreateBox(
      "farmerTrack",
      {
        width: trackWidth,
        height: 0.3,  // Thin strip
        depth: 2.5,   // Depth on Z for visual presence
      },
      scene
    );

    // Position at the farmer's walking level (rail Y minus half the track height)
    track.position = new Vector3(0, railY - 0.5, 0.2); // Slightly behind entities on Z

    // Create a dirt/earth material
    const material = new StandardMaterial("farmerTrackMat", scene);
    material.diffuseColor = new Color3(0.35, 0.28, 0.18); // Rich dirt brown
    material.specularColor = new Color3(0.05, 0.04, 0.03); // Very low specular
    material.emissiveColor = new Color3(0.05, 0.04, 0.02); // Subtle warmth
    material.alpha = 0.85;
    track.material = material;

    // Receive shadows from entities above
    track.receiveShadows = true;

    // Add grass edge strips on both sides of the track
    const grassEdgeX = trackWidth / 2 + 0.5; // Just outside the track
    const grassLeft = MeshBuilder.CreateBox(
      "grassEdgeLeft",
      { width: 1, height: 0.15, depth: 2.5 },
      scene
    );
    grassLeft.position = new Vector3(-grassEdgeX, railY - 0.4, 0.2);

    const grassRight = MeshBuilder.CreateBox(
      "grassEdgeRight",
      { width: 1, height: 0.15, depth: 2.5 },
      scene
    );
    grassRight.position = new Vector3(grassEdgeX, railY - 0.4, 0.2);

    const grassMaterial = new StandardMaterial("grassEdgeMat", scene);
    grassMaterial.diffuseColor = new Color3(0.2, 0.45, 0.15); // Green grass
    grassMaterial.specularColor = Color3.Black();
    grassMaterial.alpha = 0.7;
    grassLeft.material = grassMaterial;
    grassRight.material = grassMaterial;

    meshRef.current = track;

    return () => {
      track.dispose();
      grassLeft.dispose();
      grassRight.dispose();
      material.dispose();
      grassMaterial.dispose();
    };
  }, [scene]);

  return null;
};
