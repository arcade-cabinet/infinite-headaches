import { createReactAPI, useEntities } from "miniplex-react";
import { world } from "../ecs/world";

// Create React API for our ECS world
const ECS = createReactAPI(world);
import { Entity } from "../ecs/components";
import {
  Vector3,
  Color3,
  Color4,
  AnimationGroup,
  AbstractMesh,
  Scene as BabylonScene,
  ISceneLoaderAsyncResult,
  HemisphericLight,
  DirectionalLight,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { Scene, Engine, useScene } from "react-babylonjs";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import React, { Suspense, useEffect, useRef, useCallback, useState } from "react";
import { MovementSystem } from "../ecs/systems/MovementSystem";
import { WobbleSystem } from "../ecs/systems/WobbleSystem";
import {
  AnimationSystem,
  registerEntityAnimations,
  unregisterEntityAnimations,
  createAnimationComponent,
} from "../ecs/systems/AnimationSystem";
import {
  TornadoEffect,
  createTornadoEffect,
  getStormColors,
  setTornadoIntensity,
} from "../effects/TornadoEffect";

/**
 * EntityRenderer - Renders a single ECS entity as a 3D model with animations.
 *
 * This component:
 * 1. Loads GLB/GLTF models using Babylon.js SceneLoader
 * 2. Extracts AnimationGroups from loaded models
 * 3. Registers animations with the AnimationSystem
 * 4. Syncs entity position/rotation/scale with the mesh
 */
const EntityRenderer = ({ entity }: { entity: Entity }) => {
  const scene = useScene();
  const meshRef = useRef<AbstractMesh | null>(null);
  const loadedModelRef = useRef<ISceneLoaderAsyncResult | null>(null);
  const previousModelRef = useRef<string | null>(null);

  const position = entity.position || Vector3.Zero();
  const scale = entity.scale || new Vector3(1, 1, 1);
  const rotation = entity.modelRotation || Vector3.Zero();

  // Load model and extract animations
  const loadModel = useCallback(async () => {
    if (!scene || !entity.model || !entity.id) return;

    // Dispose previous model if it exists
    if (loadedModelRef.current) {
      unregisterEntityAnimations(entity.id);

      // Dispose all meshes
      for (const mesh of loadedModelRef.current.meshes) {
        mesh.dispose();
      }

      // Dispose all animation groups
      for (const group of loadedModelRef.current.animationGroups) {
        group.dispose();
      }

      loadedModelRef.current = null;
      meshRef.current = null;
    }

    try {
      // Parse model path to get root URL and filename
      const modelPath = entity.model;
      const lastSlash = modelPath.lastIndexOf("/");
      const rootUrl = lastSlash >= 0 ? modelPath.substring(0, lastSlash + 1) : "/";
      const filename = lastSlash >= 0 ? modelPath.substring(lastSlash + 1) : modelPath;

      // Load the GLB/GLTF model
      const result = await SceneLoader.ImportMeshAsync(
        "", // Load all meshes
        rootUrl,
        filename,
        scene
      );

      loadedModelRef.current = result;
      previousModelRef.current = entity.model;

      // Find the root mesh
      const rootMesh = result.meshes[0];
      meshRef.current = rootMesh;

      // Apply initial transforms
      if (rootMesh) {
        rootMesh.position = position.clone();
        rootMesh.scaling = scale.clone();
        rootMesh.rotation = rotation.clone();
      }

      // Register animations with the AnimationSystem
      if (result.animationGroups.length > 0 && entity.id) {
        const availableAnimations = registerEntityAnimations(
          entity.id,
          result.animationGroups,
          rootMesh,
          scene
        );

        // Initialize animation component if entity has one or create a default
        if (entity.animation) {
          entity.animation.availableAnimations = availableAnimations;
        } else {
          // Optionally add animation component if model has animations
          entity.animation = createAnimationComponent({
            availableAnimations,
            currentAnimation: availableAnimations.includes("idle")
              ? "idle"
              : availableAnimations[0] || "idle",
          });
        }

        console.log(
          `Loaded model ${entity.model} with animations:`,
          availableAnimations
        );
      }
    } catch (error) {
      console.error(`Failed to load model ${entity.model}:`, error);
    }
  }, [scene, entity.model, entity.id]);

  // Load model when component mounts or model changes
  useEffect(() => {
    if (entity.model !== previousModelRef.current) {
      loadModel();
    }
  }, [entity.model, loadModel]);

  // Sync transforms with entity state
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.copyFrom(position);
      meshRef.current.scaling.copyFrom(scale);
      meshRef.current.rotation.copyFrom(rotation);
    }
  }, [position, scale, rotation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (entity.id) {
        unregisterEntityAnimations(entity.id);
      }

      if (loadedModelRef.current) {
        for (const mesh of loadedModelRef.current.meshes) {
          mesh.dispose();
        }
        for (const group of loadedModelRef.current.animationGroups) {
          group.dispose();
        }
      }
    };
  }, [entity.id]);

  // The actual rendering is handled imperatively via SceneLoader
  return null;
};

/**
 * GameSystems - Runs ECS systems within the Babylon.js render loop.
 */
const GameSystems = () => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;

    // Hook into the Babylon render loop to run ECS systems
    const observer = scene.onBeforeRenderObservable.add(() => {
      const deltaTime = scene.getEngine().getDeltaTime() / 1000;

      // Run all ECS systems
      MovementSystem(deltaTime);
      WobbleSystem(deltaTime);
      AnimationSystem(deltaTime);
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
    };
  }, [scene]);

  return null;
};

/**
 * TornadoEffectComponent - Manages the 3D tornado particle effect.
 * The tornado intensity can be controlled via the `intensity` prop (0-1).
 */
interface TornadoProps {
  /** Tornado intensity from 0 (calm) to 1 (maximum chaos) */
  intensity?: number;
  /** Position of the tornado in world space */
  position?: Vector3;
  /** Whether the tornado is enabled */
  enabled?: boolean;
}

const TornadoEffectComponent = ({
  intensity = 0.5,
  position = new Vector3(0, 0, 50),
  enabled = true,
}: TornadoProps) => {
  const scene = useScene();
  const tornadoRef = useRef<TornadoEffect | null>(null);

  // Initialize tornado effect
  useEffect(() => {
    if (!scene || !enabled) return;

    // Create tornado effect
    const tornado = createTornadoEffect(scene, {
      position,
      baseRadius: 2,
      topRadius: 15,
      height: 40,
      particleCount: 2000,
    });

    tornadoRef.current = tornado;

    return () => {
      tornado.dispose();
      tornadoRef.current = null;
    };
  }, [scene, enabled]);

  // Update intensity
  useEffect(() => {
    if (tornadoRef.current) {
      setTornadoIntensity(tornadoRef.current, intensity);
    }
  }, [intensity]);

  // Update position
  useEffect(() => {
    if (tornadoRef.current) {
      tornadoRef.current.setPosition(position);
    }
  }, [position]);

  return null;
};

/**
 * StormAtmosphere - Manages dynamic lighting for storm atmosphere.
 * Adjusts scene lighting based on tornado intensity.
 */
interface StormAtmosphereProps {
  /** Storm intensity from 0 (calm) to 1 (full storm) */
  intensity?: number;
}

const StormAtmosphere = ({ intensity = 0.5 }: StormAtmosphereProps) => {
  const scene = useScene();
  const lightsRef = useRef<{
    hemispheric: HemisphericLight | null;
    directional: DirectionalLight | null;
  }>({ hemispheric: null, directional: null });

  // Setup storm lighting
  useEffect(() => {
    if (!scene) return;

    // Find or create hemispheric light
    let hemisphericLight = scene.getLightByName("stormAmbient") as HemisphericLight | null;
    if (!hemisphericLight) {
      hemisphericLight = new HemisphericLight(
        "stormAmbient",
        new Vector3(0, 1, 0),
        scene
      );
    }

    // Create directional light for sun/storm lighting
    let directionalLight = scene.getLightByName("stormDirectional") as DirectionalLight | null;
    if (!directionalLight) {
      directionalLight = new DirectionalLight(
        "stormDirectional",
        new Vector3(-0.5, -1, 0.5),
        scene
      );
      directionalLight.position = new Vector3(10, 20, -10);
    }

    lightsRef.current = {
      hemispheric: hemisphericLight,
      directional: directionalLight,
    };

    return () => {
      // Don't dispose lights on cleanup to avoid flicker
    };
  }, [scene]);

  // Update lighting based on intensity
  useEffect(() => {
    const { hemispheric, directional } = lightsRef.current;
    if (!hemispheric || !directional) return;

    const colors = getStormColors(intensity);

    // Update hemispheric (ambient) light
    hemispheric.diffuse = colors.ambient;
    hemispheric.groundColor = Color3.Lerp(
      colors.ambient,
      new Color3(0.2, 0.18, 0.25),
      0.5
    );
    hemispheric.intensity = 0.7 - intensity * 0.3; // Dimmer during storm

    // Update directional (sun) light
    directional.diffuse = colors.directional;
    directional.intensity = 0.8 - intensity * 0.4; // Weaker during storm
    directional.specular = Color3.Lerp(
      new Color3(1, 1, 1),
      new Color3(0.3, 0.3, 0.4),
      intensity
    );
  }, [intensity]);

  return null;
};

/**
 * GameScene - Main 3D scene component using Babylon.js with ECS integration.
 *
 * Features:
 * - ECS-driven entity rendering with model loading and animations
 * - Tornado particle effect (the "Headache" mechanic)
 * - Dynamic storm atmosphere lighting
 * - Transparent background for layered rendering over 2D canvas
 */
export const GameScene = () => {
  const entities = useEntities(world);

  // Tornado intensity state - this would typically come from game state/AI director
  // For now, default to 0.5 and allow external control
  const [tornadoIntensity, setTornadoIntensity] = useState(0.5);

  // Expose tornado intensity control globally for game director
  useEffect(() => {
    (window as any).__setTornadoIntensity = setTornadoIntensity;
    return () => {
      delete (window as any).__setTornadoIntensity;
    };
  }, []);

  return (
    <div style={{ flex: 1, width: "100%", height: "100%" }}>
      <Engine
        antialias
        adaptToDeviceRatio
        canvasId="babylon-canvas"
        canvasStyle={{ background: "transparent" }}
      >
        <Scene clearColor={new Color4(0, 0, 0, 0)}>
          {/* Main camera */}
          <freeCamera
            name="camera1"
            position={new Vector3(0, 5, -10)}
            setTarget={[new Vector3(0, 5, 0)]}
          />

          {/* Storm atmosphere lighting */}
          <StormAtmosphere intensity={tornadoIntensity} />

          {/* Tornado effect in background */}
          <TornadoEffectComponent
            intensity={tornadoIntensity}
            position={new Vector3(0, 0, 50)}
            enabled={true}
          />

          {/* Run ECS systems in the render loop */}
          <GameSystems />

          {/* Render all entities with models */}
          {entities.map((entity) => (
            <EntityRenderer key={entity.id} entity={entity} />
          ))}
        </Scene>
      </Engine>
    </div>
  );
};

// Export tornado control for external use
export { setTornadoIntensity as controlTornadoIntensity };
