/**
 * FreezeSystem - ECS system for handling frozen entities
 *
 * Manages the frozen state lifecycle:
 * 1. Frozen state with bobbing animation
 * 2. Cracking progression as timer depletes
 * 3. Shattering when fully thawed
 * 4. Transition back to falling state
 */

import { Vector3 } from "@babylonjs/core";
import { world } from "../world";
import { GAME_CONFIG } from "../../config";
import { Entity, FrozenComponent, FallingComponent } from "../components";

const { physics } = GAME_CONFIG;

export interface FreezeSystemCallbacks {
  onShatter?: (entity: Entity) => void;
  onThawComplete?: (entity: Entity) => void;
}

/**
 * Creates initial crack lines for a frozen entity
 */
export function generateCracks(width: number, height: number): FrozenComponent["cracks"] {
  const cracks: FrozenComponent["cracks"] = [];
  const numCracks = 5 + Math.floor(Math.random() * 4);

  for (let i = 0; i < numCracks; i++) {
    const startFromCenter = Math.random() > 0.5;
    let x1: number, y1: number, x2: number, y2: number;

    if (startFromCenter) {
      x1 = (Math.random() - 0.5) * width * 0.3;
      y1 = (Math.random() - 0.5) * height * 0.3;
    } else {
      const side = Math.floor(Math.random() * 4);
      switch (side) {
        case 0:
          x1 = -width * 0.5;
          y1 = (Math.random() - 0.5) * height;
          break;
        case 1:
          x1 = width * 0.5;
          y1 = (Math.random() - 0.5) * height;
          break;
        case 2:
          x1 = (Math.random() - 0.5) * width;
          y1 = -height * 0.5;
          break;
        default:
          x1 = (Math.random() - 0.5) * width;
          y1 = height * 0.5;
          break;
      }
    }

    const angle = Math.atan2(-y1, -x1) + (Math.random() - 0.5) * 1.5;
    const length = width * 0.3 + Math.random() * width * 0.4;
    x2 = x1 + Math.cos(angle) * length;
    y2 = y1 + Math.sin(angle) * length;

    cracks.push({ x1, y1, x2, y2 });
  }

  return cracks;
}

/**
 * Creates a FrozenComponent with default values
 */
export function createFrozenComponent(freezeDuration: number): FrozenComponent {
  const width = GAME_CONFIG.animal.width;
  const height = GAME_CONFIG.animal.height;

  return {
    freezeTimer: freezeDuration,
    thawProgress: 0,
    crackStage: 0,
    maxCrackStages: physics.ice.crackStages,
    bobOffset: 0,
    bobTime: Math.random() * 100,
    iceRotation: (Math.random() - 0.5) * 0.3,
    cracks: generateCracks(width, height),
  };
}

/**
 * Freezes an entity - adds frozen component and removes falling component
 */
export function freezeEntity(entity: Entity, freezeDuration: number): void {
  // Remove falling component if present
  if (entity.falling) {
    delete entity.falling;
  }

  // Stop movement
  if (entity.velocity) {
    entity.velocity = new Vector3(0, 0, 0);
  }

  // Add frozen component
  entity.frozen = createFrozenComponent(freezeDuration);
}

/**
 * Thaws an entity - removes frozen component and adds falling component
 */
export function thawEntity(entity: Entity): void {
  if (!entity.frozen) return;

  // Store position before removing frozen
  const bobOffset = entity.frozen.bobOffset;

  // Remove frozen component
  delete entity.frozen;

  // Add falling component to resume falling
  entity.falling = {
    targetX: entity.position?.x ?? 0,
    targetY: entity.position?.y ?? 0,
    behaviorType: "normal",
    spawnX: entity.position?.x ?? 0,
    spawnTime: Date.now(),
  };

  // Give initial downward velocity
  if (entity.velocity) {
    entity.velocity.y = 2;
  } else {
    entity.velocity = new Vector3(0, 2, 0);
  }

  // Adjust position by bob offset
  if (entity.position) {
    entity.position.y += bobOffset;
  }
}

/**
 * FreezeSystem - Updates all frozen entities
 *
 * @param deltaTime - Time elapsed in milliseconds
 * @param callbacks - Optional callbacks for freeze events
 */
export function FreezeSystem(deltaTime: number, callbacks?: FreezeSystemCallbacks): void {
  const frozenEntities = world.with("frozen", "position");

  for (const entity of frozenEntities) {
    const { frozen } = entity;

    // Update bob animation
    frozen.bobTime += physics.ice.fallSpeed * 0.01 * deltaTime;
    frozen.bobOffset = Math.sin(frozen.bobTime) * 5;

    // Decrement freeze timer
    frozen.freezeTimer -= deltaTime;

    // Calculate thaw progress
    const crackThreshold = frozen.maxCrackStages * 400;
    if (frozen.freezeTimer <= crackThreshold) {
      frozen.thawProgress = 1 - frozen.freezeTimer / crackThreshold;
      frozen.crackStage = Math.min(
        frozen.maxCrackStages,
        Math.floor(frozen.thawProgress * frozen.maxCrackStages)
      );

      // Shake as it cracks
      frozen.iceRotation = (Math.random() - 0.5) * 0.1 * frozen.thawProgress;

      // Faster bob during cracking
      frozen.bobTime += physics.ice.fallSpeed * 0.005 * deltaTime;
      frozen.bobOffset = Math.sin(frozen.bobTime) * 3;
    }

    // Apply bob offset to visual position (stored in modelOffset for 3D rendering)
    if (!entity.modelOffset) {
      entity.modelOffset = new Vector3(0, 0, 0);
    }
    entity.modelOffset.y = frozen.bobOffset * 0.1; // Scale for 3D world

    // Apply rotation
    if (!entity.modelRotation) {
      entity.modelRotation = new Vector3(0, 0, 0);
    }
    entity.modelRotation.z = frozen.iceRotation;

    // Check for shatter
    if (frozen.freezeTimer <= 0) {
      callbacks?.onShatter?.(entity);
      thawEntity(entity);
      callbacks?.onThawComplete?.(entity);
    }
  }
}

/**
 * Gets the freeze state for UI rendering
 */
export type FreezeState = "frozen" | "cracking" | "shattering";

export function getFreezeState(frozen: FrozenComponent): FreezeState {
  if (frozen.crackStage > 0) {
    return "cracking";
  }
  return "frozen";
}

/**
 * Query helper - get all frozen entities
 */
export function getFrozenEntities(): Entity[] {
  return Array.from(world.with("frozen"));
}

/**
 * Query helper - get frozen entities that are cracking
 */
export function getCrackingEntities(): Entity[] {
  return Array.from(world.with("frozen")).filter((e) => e.frozen!.crackStage > 0);
}
