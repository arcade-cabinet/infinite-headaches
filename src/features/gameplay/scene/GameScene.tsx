import { createReactAPI, useEntities } from "miniplex-react";
import { useEffect, useState } from "react";
import { useScene, Scene } from "reactylon";
import {
  Vector3,
  Color4,
  FreeCamera,
  HavokPlugin,
} from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import "@babylonjs/loaders/glTF";

import { world } from "@/game/ecs/world";
import { Entity } from "@/game/ecs/components";
import { useGraphics } from "@/graphics";
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
  return (
    <freeCamera 
        name="gameCamera" 
        position={new Vector3(0, 8, -15)} 
        target={new Vector3(0, 0, 5)}
    />
  );
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
  children?: React.ReactNode;
}

export const GameScene = ({
  inputCallbacks,
  inputEnabled,
  showGameplayElements = false,
  children,
  ...props // Capture _context and other props injected by Engine
}: GameSceneProps & { [key: string]: any }) => {
  const bucket = useEntities(world);
  const entities = bucket?.entities ?? [];
  const { settings } = useGraphics();
  const [havokPlugin, setHavokPlugin] = useState<HavokPlugin | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const havokInstance = await HavokPhysics({ locateFile: () => "/HavokPhysics.wasm" });
        setHavokPlugin(new HavokPlugin(true, havokInstance));
      } catch (e) {
        console.error("Failed to load Havok Physics:", e);
      }
    })();
  }, []);

  if (!havokPlugin) return null;

  return (
    <Scene 
        {...props} // Pass _context to Scene
        onSceneReady={(scene) => { scene.clearColor = new Color4(0.5, 0.8, 1.0, 1); }}
        isGui3DManager={true}
        physicsOptions={{
            plugin: havokPlugin,
            gravity: new Vector3(0, -9.81, 0)
        }}
    >
      <GameSceneContent
        entities={entities}
        quality={settings.quality}
        inputCallbacks={inputCallbacks}
        inputEnabled={inputEnabled}
        showGameplayElements={showGameplayElements}
      />
      {children}
    </Scene>
  );
};

export default GameScene;
