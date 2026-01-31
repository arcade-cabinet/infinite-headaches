/**
 * FarmEnvironment - Creates a Nebraska farmland environment with:
 * - Bright blue sky using HDRI/equirectangular skybox
 * - Ground plane with grass textures
 * - Proper horizon line and atmospheric perspective
 */

import { useEffect, useRef } from "react";
import { useScene } from "react-babylonjs";
import {
  CubeTexture,
  MeshBuilder,
  StandardMaterial,
  Texture,
  Color3,
  Color4,
  Vector3,
  Mesh,
  PBRMaterial,
  PhotoDome,
} from "@babylonjs/core";

interface FarmEnvironmentProps {
  /** Storm intensity affects environment lighting and atmosphere */
  stormIntensity?: number;
  /** Whether to show the ground plane */
  showGround?: boolean;
  /** Ground size (width and depth) */
  groundSize?: number;
  /** Texture quality multiplier from graphics settings (0.5 = half res, 1.0 = full) */
  textureQuality?: number;
}

/**
 * Creates the sky dome using equirectangular HDRI image
 */
const SkyDome = ({
  stormIntensity = 0,
  textureQuality = 1.0,
}: {
  stormIntensity: number;
  textureQuality: number;
}) => {
  const scene = useScene();
  const domeRef = useRef<PhotoDome | null>(null);

  // Adjust dome resolution based on texture quality setting
  // Higher quality = more segments for smoother appearance
  const domeResolution = textureQuality >= 0.75 ? 32 : textureQuality >= 0.5 ? 24 : 16;

  useEffect(() => {
    if (!scene) return;

    // Create photo dome for the sky
    const dome = new PhotoDome(
      "skyDome",
      "/assets/environment/sky.jpg",
      {
        resolution: domeResolution,
        size: 1000,
        useDirectMapping: false,
      },
      scene
    );

    // Adjust exposure based on storm intensity
    // Darker during storms
    const material = dome.mesh.material as StandardMaterial;
    if (material) {
      material.emissiveColor = Color3.Lerp(
        new Color3(1, 1, 1), // Bright sunny day
        new Color3(0.4, 0.35, 0.45), // Dark stormy
        stormIntensity
      );
    }

    domeRef.current = dome;

    return () => {
      dome.dispose();
      domeRef.current = null;
    };
  }, [scene, domeResolution]);

  // Update sky brightness based on storm intensity
  useEffect(() => {
    if (!domeRef.current) return;

    const material = domeRef.current.mesh.material as StandardMaterial;
    if (material) {
      material.emissiveColor = Color3.Lerp(
        new Color3(1, 1, 1),
        new Color3(0.4, 0.35, 0.45),
        stormIntensity
      );
    }
  }, [stormIntensity]);

  return null;
};

/**
 * Creates the ground plane with Nebraska farmland textures
 */
const FarmGround = ({
  size = 200,
  stormIntensity = 0,
  textureQuality = 1.0,
}: {
  size: number;
  stormIntensity: number;
  textureQuality: number;
}) => {
  const scene = useScene();
  const groundRef = useRef<Mesh | null>(null);
  const materialRef = useRef<PBRMaterial | null>(null);

  // Adjust ground subdivisions based on quality setting
  // Higher quality = more subdivisions for smoother terrain
  const groundSubdivisions = textureQuality >= 0.75 ? 32 : textureQuality >= 0.5 ? 16 : 8;

  useEffect(() => {
    if (!scene) return;

    // Create large ground plane with quality-adjusted subdivisions
    const ground = MeshBuilder.CreateGround(
      "farmGround",
      {
        width: size,
        height: size,
        subdivisions: groundSubdivisions,
      },
      scene
    );

    // Position ground below the game area
    ground.position.y = -2;

    // Create PBR material for realistic grass
    const material = new PBRMaterial("groundMaterial", scene);

    // Load grass textures
    const diffuseTexture = new Texture(
      "/assets/environment/grass_color.jpg",
      scene
    );
    diffuseTexture.uScale = size / 10; // Tile the texture
    diffuseTexture.vScale = size / 10;

    const normalTexture = new Texture(
      "/assets/environment/grass_normal.jpg",
      scene
    );
    normalTexture.uScale = size / 10;
    normalTexture.vScale = size / 10;

    material.albedoTexture = diffuseTexture;
    material.bumpTexture = normalTexture;
    material.roughness = 0.9; // Grass is rough/diffuse
    material.metallic = 0.0; // Non-metallic

    // Adjust albedo based on storm intensity (darker during storms)
    material.albedoColor = Color3.Lerp(
      new Color3(1, 1, 1),
      new Color3(0.6, 0.55, 0.5),
      stormIntensity
    );

    ground.material = material;
    groundRef.current = ground;
    materialRef.current = material;

    return () => {
      material.dispose();
      ground.dispose();
      groundRef.current = null;
      materialRef.current = null;
    };
  }, [scene, size, groundSubdivisions]);

  // Update ground color based on storm intensity
  useEffect(() => {
    if (!materialRef.current) return;

    materialRef.current.albedoColor = Color3.Lerp(
      new Color3(1, 1, 1),
      new Color3(0.6, 0.55, 0.5),
      stormIntensity
    );
  }, [stormIntensity]);

  return null;
};

/**
 * Creates distant horizon elements (trees, fences, etc.) for depth
 */
const HorizonElements = ({ stormIntensity = 0 }: { stormIntensity: number }) => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;

    // Create fog for atmospheric perspective
    scene.fogMode = 2; // Exponential squared fog
    scene.fogDensity = 0.003 + stormIntensity * 0.002;
    scene.fogColor = Color3.Lerp(
      new Color3(0.7, 0.8, 0.9), // Light blue haze
      new Color3(0.4, 0.4, 0.45), // Gray storm fog
      stormIntensity
    );

    return () => {
      scene.fogMode = 0;
    };
  }, [scene, stormIntensity]);

  return null;
};

/**
 * Main FarmEnvironment component
 */
export const FarmEnvironment = ({
  stormIntensity = 0,
  showGround = true,
  groundSize = 200,
  textureQuality = 1.0,
}: FarmEnvironmentProps) => {
  return (
    <>
      <SkyDome stormIntensity={stormIntensity} textureQuality={textureQuality} />
      {showGround && (
        <FarmGround
          size={groundSize}
          stormIntensity={stormIntensity}
          textureQuality={textureQuality}
        />
      )}
      <HorizonElements stormIntensity={stormIntensity} />
    </>
  );
};

export default FarmEnvironment;
