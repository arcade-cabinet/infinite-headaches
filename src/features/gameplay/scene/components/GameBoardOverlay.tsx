/**
 * GameBoardOverlay - Semi-transparent ground plane that visually anchors the play area.
 * Renders a subtle rectangle on the Z=0 game plane matching the playable bounds.
 */

import { useEffect, useRef } from "react";
import { useScene } from "reactylon";
import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  Vector3,
  PhysicsAggregate,
  PhysicsShapeType,
  PhysicsMotionType,
} from "@babylonjs/core";

export const GameBoardOverlay = () => {
  const scene = useScene();
  const meshRef = useRef<Mesh | null>(null);
  const materialRef = useRef<StandardMaterial | null>(null);
  const floorRef = useRef<Mesh | null>(null);
  const floorAggRef = useRef<PhysicsAggregate | null>(null);

  useEffect(() => {
    if (!scene) return;

    // Game world bounds: X from -7.5 to +7.5 (15 wide), Y from -3 to ~8 (11 tall)
    const width = 15;
    const height = 11;

    const plane = MeshBuilder.CreatePlane(
      "gameBoardOverlay",
      { width, height },
      scene
    );

    // Position centered on the play area, slightly behind entities (Z=0.1)
    plane.position = new Vector3(0, 2.8, 0.1); // Y center adjusted for camera framing

    // Plane faces -Z by default in Babylon, which is toward the camera -- correct

    const material = new StandardMaterial("gameBoardMaterial", scene);
    material.diffuseColor = new Color3(0.4, 0.34, 0.24); // Warm brown tint (farm)
    material.emissiveColor = new Color3(0.06, 0.05, 0.03); // Subtle warmth
    material.alpha = 0.22; // Visible enough to define play area without obscuring background
    material.backFaceCulling = false;
    material.disableLighting = true;

    plane.material = material;
    plane.isPickable = false;

    meshRef.current = plane;
    materialRef.current = material;

    // --- Play area border (subtle edge lines) ---
    const borderMat = new StandardMaterial("gameBoardBorderMat", scene);
    borderMat.diffuseColor = new Color3(0.55, 0.45, 0.3); // Lighter brown edge
    borderMat.emissiveColor = new Color3(0.12, 0.1, 0.06);
    borderMat.alpha = 0.35;
    borderMat.disableLighting = true;

    const borderThickness = 0.12;
    // Left edge
    const borderLeft = MeshBuilder.CreatePlane("borderLeft", { width: borderThickness, height }, scene);
    borderLeft.position = new Vector3(-width / 2, 2.8, 0.09);
    borderLeft.material = borderMat;
    borderLeft.isPickable = false;
    // Right edge
    const borderRight = MeshBuilder.CreatePlane("borderRight", { width: borderThickness, height }, scene);
    borderRight.position = new Vector3(width / 2, 2.8, 0.09);
    borderRight.material = borderMat;
    borderRight.isPickable = false;

    // --- INVISIBLE PHYSICS FLOOR ---
    // Prevents falling entities from tunneling through the player's physics body.
    // Entities that land here are cleaned up by GameLogic's MAX_FALL_TIME_MS safety net.
    if (scene.getPhysicsEngine()) {
      const floor = MeshBuilder.CreateBox(
        "physicsFloor",
        { width: 30, height: 0.5, depth: 5 },
        scene
      );
      floor.position = new Vector3(0, -4, 0);
      floor.isVisible = false;
      floor.isPickable = false;

      const floorAgg = new PhysicsAggregate(
        floor,
        PhysicsShapeType.BOX,
        { mass: 0, restitution: 0.2, friction: 0.5 },
        scene
      );
      floorAgg.body.setMotionType(PhysicsMotionType.ANIMATED);

      floorRef.current = floor;
      floorAggRef.current = floorAgg;
    }

    return () => {
      plane.dispose();
      material.dispose();
      borderLeft.dispose();
      borderRight.dispose();
      borderMat.dispose();
      meshRef.current = null;
      materialRef.current = null;
      if (floorAggRef.current) {
        floorAggRef.current.dispose();
        floorAggRef.current = null;
      }
      if (floorRef.current) {
        floorRef.current.dispose();
        floorRef.current = null;
      }
    };
  }, [scene]);

  return null;
};
