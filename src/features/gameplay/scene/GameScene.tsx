/**
 * GameScene - Pure Babylon.js 3D scene for Homestead Headaches
 *
 * Clean, cartoon 3D renderer. NO storm effects.
 */

import { createReactAPI, useEntities } from "miniplex-react";
import { useEffect } from "react";
import { useScene, Scene } from "reactylon";
import {
  Vector3,
  Color4,
  FreeCamera,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

import { world } from "../../../../game/ecs/world";
import { Entity } from "../../../../game/ecs/components";
import { useGraphics } from "@/game/graphics";
import { NebraskaDiorama } from "./NebraskaDiorama";
import { InputManager, type InputCallbacks } from "./InputManager";
import {
  PowerUpRenderer,
  FireballRenderer,
} from "./GameElements3D";

// Import extracted components
import { EntityRenderer } from "./components/EntityRenderer";
import { GameSystems } from "./components/GameSystems";

const ECS = createReactAPI(world);

const GameCamera = () => {
  const scene = useScene();
  useEffect(() => {
    if (!scene) return;
    const camera = new FreeCamera("gameCamera", new Vector3(0, 8, -15), scene);
    camera.setTarget(new Vector3(0, 0, 5));
    camera.inputs.clear();
    scene.activeCamera = camera;
    return () => camera.dispose();
  }, [scene]);
  return null;
};

interface GameSceneContentProps {
  entities: Entity[];
  quality: "low" | "medium" | "high";
  inputCallbacks: InputCallbacks;
  inputEnabled: boolean;
  showGameplayElements: boolean;
}

const GameSceneContent = ({
  entities,
  quality,
  inputCallbacks,
  inputEnabled,
  showGameplayElements,
}: GameSceneContentProps) => {
  const modelEntities = entities.filter((e) => e.model && e.position);
  const powerUpEntities = entities.filter((e) => e.tag?.type === "powerup");
  const fireballEntities = entities.filter((e) => e.gameProjectile?.type === "fireball");

  return (
    <>
      <GameCamera />
      <NebraskaDiorama quality={quality} />
      <GameSystems />
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
}

export const GameScene = ({
  inputCallbacks,
  inputEnabled,
  showGameplayElements = false,
}: GameSceneProps) => {
  const bucket = useEntities(world);
  const entities = bucket?.entities ?? [];
  const { settings } = useGraphics();

  return (
    <Scene onSceneReady={(scene) => { scene.clearColor = new Color4(0.5, 0.8, 1.0, 1); }}>
      <GameSceneContent
        entities={entities}
        quality={settings.quality}
        inputCallbacks={inputCallbacks}
        inputEnabled={inputEnabled}
        showGameplayElements={showGameplayElements}
      />
    </Scene>
  );
};

export default GameScene;
