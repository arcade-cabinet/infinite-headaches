/**
 * GameScene3D - Pure Babylon.js 3D scene for Homestead Headaches
 *
 * This is the main 3D renderer that replaces the 2D canvas.
 * All game elements are rendered here via ECS entities.
 */

import { createReactAPI, useEntities } from "miniplex-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useScene, Engine, Scene } from "react-babylonjs";
import {
  Vector3,
  Color3,
  Color4,
  AbstractMesh,
  Scene as BabylonScene,
  FreeCamera,
  ArcRotateCamera,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

import { world } from "../ecs/world";
import { Entity } from "../ecs/components";
import { useGraphics, useRenderSettings } from "../../graphics";
import { NebraskaDiorama } from "./NebraskaDiorama";
import {
  TornadoEffect,
  createTornadoEffect,
  setTornadoIntensity,
} from "../effects/TornadoEffect";
import { InputManager, type InputCallbacks } from "./InputManager";
import {
  PowerUpRenderer,
  FireballRenderer,
  ParticleEffectsManager,
  GameZones,
} from "./GameElements3D";
import {
  MovementSystem,
  WobbleSystem,
  AnimationSystem,
  registerEntityAnimations,
  unregisterEntityAnimations,
  createAnimationComponent,
} from "../ecs/systems";

// Create React API for ECS world
const ECS = createReactAPI(world);

// ============================================================
// ENTITY RENDERER
// ============================================================

/**
 * EntityRenderer - Renders a single ECS entity as a 3D model
 */
const EntityRenderer = ({ entity }: { entity: Entity }) => {
  const scene = useScene();
  const meshRef = useRef<AbstractMesh | null>(null);
  const loadedRef = useRef<boolean>(false);
  const modelPathRef = useRef<string | null>(null);

  const position = entity.position || Vector3.Zero();
  const scale = entity.scale || new Vector3(1, 1, 1);
  const rotation = entity.modelRotation || Vector3.Zero();

  // Load model
  useEffect(() => {
    if (!scene || !entity.model || !entity.id) return;
    if (loadedRef.current && modelPathRef.current === entity.model) return;

    const loadModel = async () => {
      try {
        // Parse path
        const modelPath = entity.model!;
        const lastSlash = modelPath.lastIndexOf("/");
        const rootUrl = lastSlash >= 0 ? modelPath.substring(0, lastSlash + 1) : "/";
        const filename = lastSlash >= 0 ? modelPath.substring(lastSlash + 1) : modelPath;

        // Load
        const result = await SceneLoader.ImportMeshAsync("", rootUrl, filename, scene);

        const rootMesh = result.meshes[0];
        if (rootMesh) {
          meshRef.current = rootMesh;
          rootMesh.position = position.clone();
          rootMesh.scaling = scale.clone();
          rootMesh.rotation = rotation.clone();
        }

        // Register animations if present
        if (result.animationGroups.length > 0 && entity.id) {
          const availableAnimations = registerEntityAnimations(
            entity.id,
            result.animationGroups,
            rootMesh,
            scene
          );

          if (!entity.animation) {
            entity.animation = createAnimationComponent({
              availableAnimations,
              currentAnimation: availableAnimations.includes("idle")
                ? "idle"
                : availableAnimations[0] || "idle",
            });
          }
        }

        loadedRef.current = true;
        modelPathRef.current = entity.model!;
      } catch (error) {
        console.error(`Failed to load model ${entity.model}:`, error);
      }
    };

    loadModel();

    return () => {
      if (entity.id) {
        unregisterEntityAnimations(entity.id);
      }
      if (meshRef.current) {
        meshRef.current.dispose();
        meshRef.current = null;
      }
      loadedRef.current = false;
    };
  }, [scene, entity.model, entity.id]);

  // Update transforms
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.copyFrom(position);
      meshRef.current.scaling.copyFrom(scale);
      meshRef.current.rotation.copyFrom(rotation);
    }
  }, [position, scale, rotation]);

  return null;
};

// ============================================================
// GAME SYSTEMS
// ============================================================

/**
 * GameSystems - Runs ECS systems in the render loop
 */
const GameSystems = () => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;

    const observer = scene.onBeforeRenderObservable.add(() => {
      const deltaTime = scene.getEngine().getDeltaTime() / 1000;
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

// ============================================================
// TORNADO COMPONENT
// ============================================================

interface TornadoProps {
  intensity?: number;
  position?: Vector3;
  enabled?: boolean;
  particleCount?: number;
}

const TornadoComponent = ({
  intensity = 0.5,
  position = new Vector3(0, 0, 50),
  enabled = true,
  particleCount = 1500,
}: TornadoProps) => {
  const scene = useScene();
  const tornadoRef = useRef<TornadoEffect | null>(null);

  useEffect(() => {
    if (!scene || !enabled) return;

    const tornado = createTornadoEffect(scene, {
      position,
      baseRadius: 2,
      topRadius: 15,
      height: 40,
      particleCount,
    });

    tornadoRef.current = tornado;

    return () => {
      tornado.dispose();
      tornadoRef.current = null;
    };
  }, [scene, enabled, particleCount]);

  useEffect(() => {
    if (tornadoRef.current) {
      setTornadoIntensity(tornadoRef.current, intensity);
    }
  }, [intensity]);

  useEffect(() => {
    if (tornadoRef.current) {
      tornadoRef.current.setPosition(position);
    }
  }, [position]);

  return null;
};

// ============================================================
// CAMERA SETUP
// ============================================================

/**
 * GameCamera - Sets up the proper diorama-style camera
 * The camera looks at the play area from above and behind
 */
const GameCamera = ({ quality }: { quality: string }) => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;

    // Create a free camera with proper diorama angle
    const camera = new FreeCamera(
      "gameCamera",
      new Vector3(0, 8, -15), // Above and behind
      scene
    );

    // Look at the play area
    camera.setTarget(new Vector3(0, 0, 5));

    // Lock camera position (no user control)
    camera.inputs.clear();

    // Set as active
    scene.activeCamera = camera;

    return () => {
      camera.dispose();
    };
  }, [scene, quality]);

  return null;
};

// ============================================================
// MAIN SCENE CONTENT
// ============================================================

interface GameSceneContentProps {
  entities: Entity[];
  quality: "low" | "medium" | "high";
  stormIntensity: number;
  inputCallbacks: InputCallbacks;
  inputEnabled: boolean;
  screenWidth: number;
  screenHeight: number;
}

const GameSceneContent = ({
  entities,
  quality,
  stormIntensity,
  inputCallbacks,
  inputEnabled,
  screenWidth,
  screenHeight,
}: GameSceneContentProps) => {
  const renderSettings = useRenderSettings();

  // Filter entities by type for specialized renderers
  const modelEntities = entities.filter((e) => e.model && e.position);
  const powerUpEntities = entities.filter((e) => e.tag?.type === "powerup");
  const fireballEntities = entities.filter((e) => e.gameProjectile?.type === "fireball");

  // Particle count based on graphics settings
  const tornadoParticles = Math.floor(2000 * renderSettings.particleCount);

  return (
    <>
      {/* Camera */}
      <GameCamera quality={quality} />

      {/* Nebraska Environment */}
      <NebraskaDiorama quality={quality} stormIntensity={stormIntensity} />

      {/* Tornado Effect */}
      <TornadoComponent
        intensity={stormIntensity}
        position={new Vector3(0, 0, 50)}
        enabled={quality !== "low"} // Disable tornado in LOW quality
        particleCount={tornadoParticles}
      />

      {/* Game Zones (floor line, bank area) */}
      <GameZones
        floorY={-2}
        bankZoneX={9}
        screenWidth={screenWidth}
        screenHeight={screenHeight}
      />

      {/* ECS Systems */}
      <GameSystems />

      {/* Input Handling */}
      <InputManager
        onDragStart={inputCallbacks.onDragStart}
        onDrag={inputCallbacks.onDrag}
        onDragEnd={inputCallbacks.onDragEnd}
        onTap={inputCallbacks.onTap}
        enabled={inputEnabled}
      />

      {/* Render model entities */}
      {modelEntities.map((entity) => (
        <EntityRenderer key={entity.id} entity={entity} />
      ))}

      {/* Render power-ups */}
      <PowerUpRenderer
        powerUps={powerUpEntities.map((e) => ({
          id: e.id!,
          type: e.tag?.subtype as any,
          position: e.position!,
        }))}
      />

      {/* Render fireballs */}
      <FireballRenderer
        fireballs={fireballEntities.map((e) => ({
          id: e.id!,
          position: e.position!,
          direction: (e.gameProjectile?.direction.x ?? 1) > 0 ? 1 : -1,
        }))}
      />
    </>
  );
};

// ============================================================
// MAIN EXPORT
// ============================================================

interface GameScene3DProps {
  inputCallbacks: InputCallbacks;
  inputEnabled: boolean;
  stormIntensity?: number;
}

export const GameScene3D = ({
  inputCallbacks,
  inputEnabled,
  stormIntensity = 0.4,
}: GameScene3DProps) => {
  const bucket = useEntities(world);
  const entities = bucket?.entities ?? [];

  const { settings } = useGraphics();
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1920,
    height: typeof window !== "undefined" ? window.innerHeight : 1080,
  });

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Engine
        antialias={settings.antialiasing}
        adaptToDeviceRatio
        canvasId="game-canvas"
      >
        <Scene clearColor={new Color4(0.3, 0.35, 0.4, 1)}>
          <GameSceneContent
            entities={entities}
            quality={settings.quality}
            stormIntensity={stormIntensity}
            inputCallbacks={inputCallbacks}
            inputEnabled={inputEnabled}
            screenWidth={screenSize.width}
            screenHeight={screenSize.height}
          />
        </Scene>
      </Engine>
    </div>
  );
};

export default GameScene3D;
