/**
 * NebraskaDiorama - Quality-tiered 3D environment for Homestead Headaches
 *
 * LOW: Procedurally generated sky gradient, flat colored ground, no effects
 * MEDIUM: PhotoDome sky, textured grass, visible field, farmer on track
 * HIGH: Full diorama with rolling prairie, DOF, AmbientCG textures, farm silhouettes
 */

import { useEffect, useRef, useMemo } from "react";
import { useScene } from "react-babylonjs";
import {
  Color3,
  Color4,
  Vector3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  PBRMaterial,
  Texture,
  PhotoDome,
  GradientMaterial,
  VertexBuffer,
  VertexData,
  HemisphericLight,
  DirectionalLight,
  DepthOfFieldEffectBlurLevel,
  DefaultRenderingPipeline,
} from "@babylonjs/core";
import type { QualityLevel } from "../../graphics";

// ============================================================
// TYPES
// ============================================================

interface NebraskaDioramaProps {
  quality: QualityLevel;
  stormIntensity?: number;
}

// ============================================================
// LOW QUALITY - PROCEDURAL
// ============================================================

/**
 * ProceduralSky - Simple gradient sky for LOW quality
 * Uses a hemisphere mesh with vertex colors for smooth gradient
 */
const ProceduralSky = ({ stormIntensity = 0 }: { stormIntensity: number }) => {
  const scene = useScene();
  const meshRef = useRef<Mesh | null>(null);

  useEffect(() => {
    if (!scene) return;

    // Create a large inverted hemisphere
    const sky = MeshBuilder.CreateSphere(
      "proceduralSky",
      {
        diameter: 500,
        segments: 16,
        sideOrientation: Mesh.BACKSIDE, // Inside-out
      },
      scene
    );

    // Position sky so horizon is at Y=0
    sky.position.y = -50;

    // Create simple sky material
    const material = new StandardMaterial("skyMat", scene);
    material.backFaceCulling = false;
    material.disableLighting = true;

    // Sky colors based on storm intensity
    const topColor = Color3.Lerp(
      new Color3(0.4, 0.6, 0.9), // Bright blue
      new Color3(0.3, 0.3, 0.4), // Storm gray
      stormIntensity
    );
    const horizonColor = Color3.Lerp(
      new Color3(0.8, 0.85, 0.95), // Light horizon
      new Color3(0.5, 0.45, 0.5), // Storm horizon
      stormIntensity
    );

    material.emissiveColor = topColor;
    sky.material = material;

    meshRef.current = sky;

    return () => {
      material.dispose();
      sky.dispose();
    };
  }, [scene, stormIntensity]);

  return null;
};

/**
 * ProceduralGround - Simple flat colored ground for LOW quality
 */
const ProceduralGround = ({ stormIntensity = 0 }: { stormIntensity: number }) => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;

    // Simple flat ground
    const ground = MeshBuilder.CreateGround(
      "proceduralGround",
      { width: 100, height: 100 },
      scene
    );
    ground.position.y = -3;

    const material = new StandardMaterial("groundMat", scene);

    // Ground color: green grass, darker in storm
    material.diffuseColor = Color3.Lerp(
      new Color3(0.3, 0.5, 0.2), // Green grass
      new Color3(0.2, 0.35, 0.15), // Darker storm
      stormIntensity
    );
    material.specularColor = Color3.Black();

    ground.material = material;

    return () => {
      material.dispose();
      ground.dispose();
    };
  }, [scene, stormIntensity]);

  return null;
};

// ============================================================
// MEDIUM QUALITY - PHOTODOME + TEXTURED
// ============================================================

/**
 * PhotoSky - PhotoDome sky for MEDIUM quality
 */
const PhotoSky = ({ stormIntensity = 0 }: { stormIntensity: number }) => {
  const scene = useScene();
  const domeRef = useRef<PhotoDome | null>(null);

  useEffect(() => {
    if (!scene) return;

    // Create photo dome with sky texture
    const dome = new PhotoDome(
      "photoDome",
      "/assets/environment/sky.jpg",
      {
        resolution: 24,
        size: 500,
        useDirectMapping: false,
      },
      scene
    );

    // Adjust brightness based on storm
    const material = dome.mesh.material as StandardMaterial;
    if (material) {
      material.emissiveColor = Color3.Lerp(
        new Color3(1, 1, 1),
        new Color3(0.5, 0.45, 0.5),
        stormIntensity
      );
    }

    domeRef.current = dome;

    return () => {
      dome.dispose();
    };
  }, [scene]);

  // Update storm intensity
  useEffect(() => {
    if (!domeRef.current) return;

    const material = domeRef.current.mesh.material as StandardMaterial;
    if (material) {
      material.emissiveColor = Color3.Lerp(
        new Color3(1, 1, 1),
        new Color3(0.5, 0.45, 0.5),
        stormIntensity
      );
    }
  }, [stormIntensity]);

  return null;
};

/**
 * TexturedGround - Grass textured ground for MEDIUM quality
 */
const TexturedGround = ({ stormIntensity = 0 }: { stormIntensity: number }) => {
  const scene = useScene();
  const materialRef = useRef<PBRMaterial | null>(null);

  useEffect(() => {
    if (!scene) return;

    // Ground with more subdivisions for better texture
    const ground = MeshBuilder.CreateGround(
      "texturedGround",
      { width: 200, height: 200, subdivisions: 16 },
      scene
    );
    ground.position.y = -3;

    // PBR material with grass texture
    const material = new PBRMaterial("groundPBR", scene);

    // Load grass textures
    const diffuse = new Texture("/assets/environment/grass_color.jpg", scene);
    diffuse.uScale = 20;
    diffuse.vScale = 20;

    const normal = new Texture("/assets/environment/grass_normal.jpg", scene);
    normal.uScale = 20;
    normal.vScale = 20;

    material.albedoTexture = diffuse;
    material.bumpTexture = normal;
    material.roughness = 0.9;
    material.metallic = 0;

    ground.material = material;
    materialRef.current = material;

    return () => {
      diffuse.dispose();
      normal.dispose();
      material.dispose();
      ground.dispose();
    };
  }, [scene]);

  // Update based on storm
  useEffect(() => {
    if (!materialRef.current) return;

    materialRef.current.albedoColor = Color3.Lerp(
      Color3.White(),
      new Color3(0.7, 0.65, 0.6),
      stormIntensity
    );
  }, [stormIntensity]);

  return null;
};

// ============================================================
// HIGH QUALITY - FULL DIORAMA
// ============================================================

/**
 * Creates rolling hills terrain with displacement
 */
const RollingPrairie = ({ stormIntensity = 0 }: { stormIntensity: number }) => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;

    // Create ground with high subdivision for terrain
    const ground = MeshBuilder.CreateGround(
      "rollingPrairie",
      { width: 300, height: 300, subdivisions: 64 },
      scene
    );
    ground.position.y = -3;

    // Apply height displacement for rolling hills
    const positions = ground.getVerticesData(VertexBuffer.PositionKind);
    if (positions) {
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];

        // Multiple octaves of noise for natural hills
        const noise1 = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 3;
        const noise2 = Math.sin(x * 0.05 + 1.5) * Math.cos(z * 0.05 + 2.3) * 1.5;
        const noise3 = Math.sin(x * 0.1 + 0.7) * Math.cos(z * 0.1 + 1.1) * 0.5;

        // Height decreases near center (where gameplay happens)
        const distFromCenter = Math.sqrt(x * x + z * z);
        const flattenFactor = Math.max(0, (distFromCenter - 20) / 50);

        positions[i + 1] = (noise1 + noise2 + noise3) * flattenFactor;
      }

      ground.updateVerticesData(VertexBuffer.PositionKind, positions);
      ground.createNormals(false);
    }

    // High quality PBR material with AmbientCG-style textures
    const material = new PBRMaterial("prairiePBR", scene);

    // Load textures (could be from AmbientCG)
    const diffuse = new Texture("/assets/environment/grass_color.jpg", scene);
    diffuse.uScale = 30;
    diffuse.vScale = 30;

    const normal = new Texture("/assets/environment/grass_normal.jpg", scene);
    normal.uScale = 30;
    normal.vScale = 30;

    material.albedoTexture = diffuse;
    material.bumpTexture = normal;
    material.roughness = 0.85;
    material.metallic = 0;

    // Storm darkening
    material.albedoColor = Color3.Lerp(
      Color3.White(),
      new Color3(0.6, 0.55, 0.5),
      stormIntensity
    );

    ground.material = material;

    return () => {
      diffuse.dispose();
      normal.dispose();
      material.dispose();
      ground.dispose();
    };
  }, [scene, stormIntensity]);

  return null;
};

/**
 * HDRISky - Full quality HDRI sky dome
 */
const HDRISky = ({ stormIntensity = 0 }: { stormIntensity: number }) => {
  const scene = useScene();
  const domeRef = useRef<PhotoDome | null>(null);

  useEffect(() => {
    if (!scene) return;

    // High resolution photo dome
    const dome = new PhotoDome(
      "hdriSky",
      "/assets/environment/sky.jpg", // Could be replaced with HDR
      {
        resolution: 32,
        size: 800,
        useDirectMapping: false,
      },
      scene
    );

    domeRef.current = dome;

    return () => {
      dome.dispose();
    };
  }, [scene]);

  useEffect(() => {
    if (!domeRef.current) return;

    const material = domeRef.current.mesh.material as StandardMaterial;
    if (material) {
      material.emissiveColor = Color3.Lerp(
        new Color3(1, 1, 1),
        new Color3(0.4, 0.38, 0.45),
        stormIntensity
      );
    }
  }, [stormIntensity]);

  return null;
};

/**
 * DepthOfFieldEffect - Adds DOF to the HIGH quality rendering
 */
const DepthOfFieldEffect = () => {
  const scene = useScene();

  useEffect(() => {
    if (!scene || !scene.activeCamera) return;

    // Create default rendering pipeline for post-processing
    const pipeline = new DefaultRenderingPipeline(
      "dofPipeline",
      true,
      scene,
      [scene.activeCamera]
    );

    // Enable depth of field
    pipeline.depthOfFieldEnabled = true;
    pipeline.depthOfFieldBlurLevel = DepthOfFieldEffectBlurLevel.Medium;
    pipeline.depthOfField.focusDistance = 5000; // Focus on gameplay area
    pipeline.depthOfField.focalLength = 50;
    pipeline.depthOfField.fStop = 2.8;

    // Enable bloom for glow effects
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.8;
    pipeline.bloomWeight = 0.3;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;

    return () => {
      pipeline.dispose();
    };
  }, [scene]);

  return null;
};

/**
 * FarmSilhouettes - Distant farm elements for HIGH quality
 */
const FarmSilhouettes = ({ stormIntensity = 0 }: { stormIntensity: number }) => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;

    const silhouettes: Mesh[] = [];

    // Create simple barn silhouette
    const barnBase = MeshBuilder.CreateBox(
      "barnBase",
      { width: 8, height: 6, depth: 12 },
      scene
    );
    barnBase.position = new Vector3(-40, 0, 60);

    const barnRoof = MeshBuilder.CreateCylinder(
      "barnRoof",
      { height: 12, diameterTop: 0, diameterBottom: 10 },
      scene
    );
    barnRoof.rotation.z = Math.PI / 2;
    barnRoof.position = new Vector3(-40, 4.5, 60);

    // Windmill tower
    const tower = MeshBuilder.CreateCylinder(
      "windmillTower",
      { height: 15, diameterTop: 1, diameterBottom: 2 },
      scene
    );
    tower.position = new Vector3(50, 4.5, 70);

    // Simple dark material for silhouettes
    const silhouetteMat = new StandardMaterial("silhouetteMat", scene);
    silhouetteMat.diffuseColor = Color3.Lerp(
      new Color3(0.15, 0.12, 0.1),
      new Color3(0.1, 0.08, 0.08),
      stormIntensity
    );
    silhouetteMat.specularColor = Color3.Black();

    [barnBase, barnRoof, tower].forEach((mesh) => {
      mesh.material = silhouetteMat;
      silhouettes.push(mesh);
    });

    return () => {
      silhouettes.forEach((m) => m.dispose());
      silhouetteMat.dispose();
    };
  }, [scene, stormIntensity]);

  return null;
};

/**
 * AtmosphericFog - Adds fog for depth in MEDIUM and HIGH
 */
const AtmosphericFog = ({
  quality,
  stormIntensity = 0,
}: {
  quality: QualityLevel;
  stormIntensity: number;
}) => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;

    // Enable fog
    scene.fogMode = 2; // Exponential squared

    // Fog density based on quality and storm
    const baseDensity = quality === "high" ? 0.002 : 0.003;
    scene.fogDensity = baseDensity + stormIntensity * 0.003;

    // Fog color
    scene.fogColor = Color3.Lerp(
      new Color3(0.7, 0.75, 0.85), // Light blue haze
      new Color3(0.4, 0.38, 0.42), // Storm gray
      stormIntensity
    );

    return () => {
      scene.fogMode = 0;
    };
  }, [scene, quality, stormIntensity]);

  return null;
};

/**
 * SceneLighting - Quality-appropriate lighting setup
 */
const SceneLighting = ({
  quality,
  stormIntensity = 0,
}: {
  quality: QualityLevel;
  stormIntensity: number;
}) => {
  const scene = useScene();
  const lightsRef = useRef<{ hemi: HemisphericLight | null; dir: DirectionalLight | null }>({
    hemi: null,
    dir: null,
  });

  useEffect(() => {
    if (!scene) return;

    // Hemispheric light for ambient
    const hemi = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.7 - stormIntensity * 0.3;
    hemi.groundColor = new Color3(0.3, 0.25, 0.2);

    // Directional light for sun (only in MEDIUM and HIGH)
    let dir: DirectionalLight | null = null;
    if (quality !== "low") {
      dir = new DirectionalLight("sunLight", new Vector3(-0.5, -1, 0.5), scene);
      dir.intensity = 0.8 - stormIntensity * 0.4;
      dir.diffuse = Color3.Lerp(
        new Color3(1, 0.95, 0.9), // Warm sun
        new Color3(0.5, 0.5, 0.55), // Cool storm
        stormIntensity
      );
    }

    lightsRef.current = { hemi, dir };

    return () => {
      hemi.dispose();
      dir?.dispose();
    };
  }, [scene, quality]);

  // Update intensity based on storm
  useEffect(() => {
    const { hemi, dir } = lightsRef.current;

    if (hemi) {
      hemi.intensity = 0.7 - stormIntensity * 0.3;
    }
    if (dir) {
      dir.intensity = 0.8 - stormIntensity * 0.4;
    }
  }, [stormIntensity]);

  return null;
};

// ============================================================
// MAIN COMPONENT
// ============================================================

/**
 * NebraskaDiorama - Renders the complete environment based on quality level
 */
export const NebraskaDiorama = ({
  quality,
  stormIntensity = 0.3,
}: NebraskaDioramaProps) => {
  return (
    <>
      {/* Lighting (all quality levels) */}
      <SceneLighting quality={quality} stormIntensity={stormIntensity} />

      {/* LOW QUALITY */}
      {quality === "low" && (
        <>
          <ProceduralSky stormIntensity={stormIntensity} />
          <ProceduralGround stormIntensity={stormIntensity} />
        </>
      )}

      {/* MEDIUM QUALITY */}
      {quality === "medium" && (
        <>
          <PhotoSky stormIntensity={stormIntensity} />
          <TexturedGround stormIntensity={stormIntensity} />
          <AtmosphericFog quality={quality} stormIntensity={stormIntensity} />
        </>
      )}

      {/* HIGH QUALITY */}
      {quality === "high" && (
        <>
          <HDRISky stormIntensity={stormIntensity} />
          <RollingPrairie stormIntensity={stormIntensity} />
          <FarmSilhouettes stormIntensity={stormIntensity} />
          <AtmosphericFog quality={quality} stormIntensity={stormIntensity} />
          <DepthOfFieldEffect />
        </>
      )}
    </>
  );
};

export default NebraskaDiorama;
