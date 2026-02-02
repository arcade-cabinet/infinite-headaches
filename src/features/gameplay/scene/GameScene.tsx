import { createReactAPI, useEntities } from "miniplex-react";
import { useEffect } from "react";
import { useScene, Scene } from "reactylon";
import {
  Vector3,
  Color4,
  FreeCamera,
  HavokPlugin,
  PBRMaterial,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

import { world } from "@/game/ecs/world";
import { Entity } from "@/game/ecs/components";
import { useGraphics } from "@/graphics";
import { useResponsiveScale } from "@/game/hooks/useResponsiveScale";
import { NebraskaDiorama } from "./NebraskaDiorama";
import { WeatherEffects } from "@/game/graphics/environment/WeatherEffects";
import type { WeatherState } from "@/game/systems/WeatherSystem";
import { InputManager, type InputCallbacks } from "./InputManager";
import {
  PowerUpRenderer,
  FireballRenderer,
} from "./GameElements3D";

// Import extracted components
import { EntityRenderer } from "./components/EntityRenderer";
import { GameSystems } from "./components/GameSystems";
import { GameBoardOverlay } from "./components/GameBoardOverlay";
import { DropIndicatorTornado } from "./components/DropIndicatorTornado";
import { FarmerTrack } from "./components/FarmerTrack";
import { PhysicsCollisionBridge, type PhysicsCatchEvent } from "./components/PhysicsCollisionBridge";

const ECS = createReactAPI(world);

/**
 * Reactively updates scene clear color when showEnvironment changes.
 * onSceneReady only fires once, so we need this for dynamic transitions.
 */
const SceneBackground = ({ showEnvironment }: { showEnvironment: boolean }) => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;
    scene.clearColor = showEnvironment
      ? new Color4(0.5, 0.8, 1.0, 1)
      : new Color4(0, 0, 0, 0);
  }, [scene, showEnvironment]);

  return null;
};

/** Per-frame getter functions for tornado indicator (avoids 60fps React re-renders). */
export interface TornadoGetters {
  getNextDropX: () => number;
  getDropDifficulty: () => number;
  getIsDropImminent: () => boolean;
}

interface GameSceneContentProps {
  entities: Entity[];
  quality: "low" | "medium" | "high";
  inputCallbacks: InputCallbacks;
  inputEnabled: boolean;
  showGameplayElements: boolean;
  tornadoGetters?: TornadoGetters;
  onPhysicsCatch?: (event: PhysicsCatchEvent) => void;
  weather?: WeatherState | null;
  reducedMotion?: boolean;
  combo?: number;
}

const GameSceneContent = ({
  entities,
  quality,
  inputCallbacks,
  inputEnabled,
  showGameplayElements,
  tornadoGetters,
  onPhysicsCatch,
  weather,
  reducedMotion,
  combo,
}: GameSceneContentProps) => {
  const modelEntities = entities.filter((e) => e.model && e.position);
  const powerUpEntities = entities.filter((e) => e.tag?.type === "powerup");
  const fireballEntities = entities.filter((e) => e.gameProjectile?.type === "fireball");

  // Responsive Camera Logic
  const { aspectRatio } = useResponsiveScale();
  const scene = useScene();

  useEffect(() => {
    if (!scene || !scene.activeCamera) return;

    const camera = scene.activeCamera as FreeCamera;

    // Game world is on the Z=0 plane:
    //   X: -8 to +8 (horizontal), Y: -3 (farmer track) to 11.75 (tornado top)
    // Camera must be far enough back on Z to see ~18 units wide
    const fov = camera.fov || 0.8; // Default BJS FOV
    const halfFov = fov / 2;
    const requiredWidth = 18; // Slightly wider than play area for margin
    const dist = (requiredWidth / 2) / Math.tan(halfFov);
    const targetZ = -Math.max(18, dist / aspectRatio);

    // Camera Y: center the view on the game world.
    // Original default is 2.0 which centers between track (Y≈-3) and tornado (Y≈10).
    const cameraY = 2.0;

    camera.position.set(0, cameraY, targetZ);
    camera.setTarget(new Vector3(0, cameraY, 0));

  }, [scene, aspectRatio]);

  // Camera zoom pulse on combo milestones (5, 10, 15)
  useEffect(() => {
    if (!scene || !scene.activeCamera || reducedMotion) return;
    if (combo !== 5 && combo !== 10 && combo !== 15) return;

    const camera = scene.activeCamera as FreeCamera;
    const originalFov = camera.fov;
    camera.fov = originalFov * 0.95; // Zoom in by 5%

    const timer = setTimeout(() => {
      camera.fov = originalFov;
    }, 200);

    return () => {
      clearTimeout(timer);
      camera.fov = originalFov;
    };
  }, [scene, combo, reducedMotion]);

  return (
    <>
      <NebraskaDiorama quality={quality} />
      {weather && <WeatherEffects weather={weather} reducedMotion={reducedMotion} />}
      <GameSystems />
      {showGameplayElements && onPhysicsCatch && (
        <PhysicsCollisionBridge onPhysicsCatch={onPhysicsCatch} />
      )}
      {showGameplayElements && <GameBoardOverlay />}
      {showGameplayElements && <FarmerTrack />}
      {showGameplayElements && tornadoGetters && (
        <DropIndicatorTornado
          getTargetX={tornadoGetters.getNextDropX}
          getIntensity={tornadoGetters.getDropDifficulty}
          getIsDropImminent={tornadoGetters.getIsDropImminent}
          visible={showGameplayElements}
        />
      )}
      <InputManager
        onDragStart={inputCallbacks.onDragStart}
        onDrag={inputCallbacks.onDrag}
        onDragEnd={inputCallbacks.onDragEnd}
        onTap={inputCallbacks.onTap}
        enabled={inputEnabled}
      />
      {modelEntities.map((entity) => (
        <EntityRenderer key={entity.id} entity={entity} />
      ))}
      <PowerUpRenderer
        powerUps={powerUpEntities.map((e) => ({
          id: e.id!,
          type: e.tag?.subtype as any,
          position: e.position!,
        }))}
      />
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

export interface GameSceneProps {
  inputCallbacks: InputCallbacks;
  inputEnabled: boolean;
  showGameplayElements?: boolean;
  showEnvironment?: boolean;
  havokPlugin: HavokPlugin;
  tornadoGetters?: TornadoGetters;
  onPhysicsCatch?: (event: PhysicsCatchEvent) => void;
  weather?: WeatherState | null;
  reducedMotion?: boolean;
  combo?: number;
  children?: React.ReactNode;
}

export const GameScene = ({
  inputCallbacks,
  inputEnabled,
  showGameplayElements = false,
  showEnvironment = true,
  havokPlugin,
  tornadoGetters,
  onPhysicsCatch,
  weather,
  reducedMotion,
  combo,
  children,
  ...props // Capture _context and other props injected by Engine
}: GameSceneProps & { [key: string]: any }) => {
  const bucket = useEntities(world);
  const entities = bucket?.entities ?? [];
  const { settings } = useGraphics();

  return (
    <Scene
        {...props} // Pass _context to Scene
        onSceneReady={(scene) => {
            scene.clearColor = new Color4(0, 0, 0, 0);

            // Create camera for the game view - looking at Z=0 plane from behind
            if (!scene.activeCamera) {
                const camera = new FreeCamera("gameCamera", new Vector3(0, 2.0, -22), scene);
                camera.setTarget(new Vector3(0, 2.0, 0));
                scene.activeCamera = camera;
                // Do NOT call attachControl - game input is handled by InputManager
            }

            // Fix PBR materials imported from GLB with alpha=0 (GLTF alphaMode:"MASK"
            // + baseColorFactor[3]=0 causes BabylonJS to set alpha=0, discarding all fragments)
            scene.onNewMaterialAddedObservable.add((material) => {
                if (material instanceof PBRMaterial && material.alpha === 0) {
                    material.alpha = 1;
                    material.transparencyMode = 0; // OPAQUE
                }
            });
        }}
        isGui3DManager={true}
        physicsOptions={{
            plugin: havokPlugin,
            gravity: new Vector3(0, -9.81, 0)
        }}
    >
      <SceneBackground showEnvironment={showEnvironment} />
      {showEnvironment && (
        <GameSceneContent
          entities={entities}
          quality={settings.quality}
          inputCallbacks={inputCallbacks}
          inputEnabled={inputEnabled}
          showGameplayElements={showGameplayElements}
          tornadoGetters={tornadoGetters}
          onPhysicsCatch={onPhysicsCatch}
          weather={weather}
          reducedMotion={reducedMotion}
          combo={combo}
        />
      )}
      {children}
    </Scene>
  );
};

export default GameScene;
