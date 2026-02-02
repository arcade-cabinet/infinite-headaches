/**
 * PhysicsCollisionBridge - Bridges Havok physics collision events to game logic.
 *
 * Listens to the physics engine's collision observable and routes
 * COLLISION_STARTED events between falling animals and player/stacked bodies
 * to the GameLogic collision queue for catch processing.
 */

import { useEffect } from "react";
import { useScene } from "reactylon";
import { HavokPlugin, PhysicsBody, type IPhysicsCollisionEvent } from "@babylonjs/core";

export interface PhysicsCatchEvent {
  fallingEntityId: string;
  landedOnId: string;
  contactPointX: number;
  landedOnTag: string;
}

interface PhysicsCollisionBridgeProps {
  /** Callback to push catch events to GameLogic's collision queue. */
  onPhysicsCatch: (event: PhysicsCatchEvent) => void;
}

/**
 * Resolves entity metadata from a physics body by walking up the transform hierarchy.
 */
function getEntityMetadata(body: PhysicsBody): { entityId?: string; physicsTag?: string } | null {
  const node = body.transformNode;
  if (!node) return null;
  if (node.metadata?.entityId) return node.metadata;
  // Check parent (for compound shapes)
  if (node.parent && (node.parent as any).metadata?.entityId) {
    return (node.parent as any).metadata;
  }
  return null;
}

export const PhysicsCollisionBridge = ({ onPhysicsCatch }: PhysicsCollisionBridgeProps) => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;

    const physicsEngine = scene.getPhysicsEngine();
    if (!physicsEngine) return;

    const plugin = physicsEngine.getPhysicsPlugin() as HavokPlugin;
    if (!plugin || !plugin.onCollisionObservable) return;

    const observer = plugin.onCollisionObservable.add((event: IPhysicsCollisionEvent) => {
      // Only process collision start events
      if (event.type !== "COLLISION_STARTED") return;

      const metaA = getEntityMetadata(event.collider);
      const metaB = getEntityMetadata(event.collidedAgainst);

      if (!metaA || !metaB) return;

      // Determine which is the falling entity and which is the catcher
      let fallingMeta: typeof metaA = null!;
      let catcherMeta: typeof metaB = null!;

      if (metaA.physicsTag === "falling" && (metaB.physicsTag === "player" || metaB.physicsTag === "stacked")) {
        fallingMeta = metaA;
        catcherMeta = metaB;
      } else if (metaB.physicsTag === "falling" && (metaA.physicsTag === "player" || metaA.physicsTag === "stacked")) {
        fallingMeta = metaB;
        catcherMeta = metaA;
      } else {
        return; // Not a falling-to-catcher collision
      }

      if (!fallingMeta.entityId || !catcherMeta.entityId) return;

      // event.point is Nullable<Vector3> — world-space contact position
      const contactPointX = event.point?.x ?? 0;

      onPhysicsCatch({
        fallingEntityId: fallingMeta.entityId,
        landedOnId: catcherMeta.entityId,
        contactPointX,
        landedOnTag: catcherMeta.physicsTag || "player",
      });
    });

    return () => {
      plugin.onCollisionObservable.remove(observer);
    };
  }, [scene, onPhysicsCatch]);

  return null;
};
