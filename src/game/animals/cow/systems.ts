/**
 * Cow-Specific ECS Systems
 *
 * Systems for cow entities and their unique behaviors.
 */

import { Vector3, Color3 } from "@babylonjs/core";
import { world } from "../../ecs/world";
import type { Entity } from "../../ecs/components";
import type { AnimalEntity, PokeResult } from "../types";
import { createSeededRandom } from "../types";
import {
  createCowPoopProjectileComponent,
  createCowBushComponent,
  isCowEntity,
  isBrownCow,
  isCowPoop,
  isCowBush,
  trampleBush,
  type CowEntity,
  type CowPoopProjectileComponent,
  type CowBushComponent,
} from "./components";
import { COW_VARIANTS, POOP_BUSH_CONFIG, BROWN_COW_POOP_ABILITY } from "./config";
import { handleBasePoke, getRandomDirection } from "../base/AnimalBase";
import { GAME_CONFIG } from "../../config";

/**
 * Callback type for cow-specific events
 */
export interface CowSystemCallbacks {
  /** Called when a poop projectile is launched */
  onPoopLaunched?: (
    cowEntity: CowEntity,
    projectileEntity: Entity,
    direction: Vector3
  ) => void;
  /** Called when a bush spawns from poop impact */
  onBushSpawned?: (bushEntity: Entity, position: Vector3, seed: string) => void;
  /** Called when an animal bounces off a bush */
  onBushBounce?: (
    animalEntity: Entity,
    bushEntity: Entity,
    bounceForce: number
  ) => void;
  /** Called when a bush is destroyed */
  onBushDestroyed?: (bushEntity: Entity) => void;
}

/** Global callbacks - set by the module consumer */
let systemCallbacks: CowSystemCallbacks = {};

/**
 * Set callbacks for cow system events
 */
export function setCowSystemCallbacks(callbacks: CowSystemCallbacks): void {
  systemCallbacks = callbacks;
}

/**
 * Cow Poop Projectile System
 *
 * Handles poop projectile movement, gravity, and impact detection.
 */
export function CowPoopProjectileSystem(deltaTime: number): void {
  const projectiles = world.with("position", "velocity");

  for (const entity of projectiles) {
    const cowPoop = (entity as CowEntity).cowPoop;
    if (!cowPoop || cowPoop.hasSpawnedBush) continue;

    const pos = entity.position!;
    const vel = entity.velocity!;

    // Apply gravity (poop follows an arc)
    const gravity = 9.8;
    vel.y -= gravity * (deltaTime / 1000);

    // Apply air resistance
    const airResistance = 0.98;
    vel.scaleInPlace(airResistance);

    // Update position
    pos.addInPlace(vel.scale(deltaTime / 1000));

    // Update trail intensity (fades over time)
    cowPoop.trailIntensity = Math.max(0, cowPoop.trailIntensity - 0.001 * deltaTime);

    // Check for ground impact
    // Ground is at Y=0 in world coordinates (adjust based on your coordinate system)
    const groundY = -4; // Adjust based on your game's ground level
    if (pos.y <= groundY) {
      // Impact! Spawn a bush
      pos.y = groundY;
      spawnBushFromPoop(entity as CowEntity, cowPoop);
    }

    // Check for timeout
    cowPoop.timeRemaining -= deltaTime;
    if (cowPoop.timeRemaining <= 0) {
      world.remove(entity);
    }
  }
}

/**
 * Spawn a bush when poop lands
 */
function spawnBushFromPoop(
  projectileEntity: CowEntity,
  poop: CowPoopProjectileComponent
): void {
  if (poop.hasSpawnedBush) return;

  poop.hasSpawnedBush = true;
  const pos = projectileEntity.position!;

  // Create bush entity
  const bushEntity: CowEntity = {
    id: `bush_${poop.bushSeed}`,
    position: new Vector3(pos.x, pos.y, pos.z),
    scale: new Vector3(0.1, 0.1, 0.1), // Start small, grow with animation
    tag: { type: "platform" }, // Bushes are platform-like for collision
    cowBush: createCowBushComponent(
      poop.bushSeed,
      poop.sourceEntityId,
      pos.clone()
    ),
  };

  // Add to world
  world.add(bushEntity);

  // Fire callback
  if (systemCallbacks.onBushSpawned) {
    systemCallbacks.onBushSpawned(bushEntity, pos.clone(), poop.bushSeed);
  }

  // Update source cow's state
  updateSourceCowBushCount(poop.sourceEntityId, bushEntity.id!);

  // Remove the projectile after a short delay (for visual feedback)
  setTimeout(() => {
    if (world.has(projectileEntity)) {
      world.remove(projectileEntity);
    }
  }, 100);
}

/**
 * Update the source cow's bush tracking
 */
function updateSourceCowBushCount(cowId: string, bushId: string): void {
  // Find the cow entity
  const entities = world.with("animalVariant" as keyof Entity);

  for (const entity of entities) {
    if (entity.id !== cowId) continue;

    const variant = (entity as AnimalEntity).animalVariant;
    if (!variant) continue;

    // Track the new bush
    const bushIds = (variant.variantState.spawnedBushIds as string[]) || [];
    bushIds.push(bushId);
    variant.variantState.spawnedBushIds = bushIds;
    variant.variantState.bushesSpawned =
      ((variant.variantState.bushesSpawned as number) || 0) + 1;

    // Enforce max bushes limit
    const maxBushes = (variant.variantState.maxBushes as number) || 3;
    if (bushIds.length > maxBushes) {
      // Remove oldest bush
      const oldestBushId = bushIds.shift();
      if (oldestBushId) {
        removeBushById(oldestBushId);
      }
    }

    break;
  }
}

/**
 * Remove a bush by its ID
 */
function removeBushById(bushId: string): void {
  const entities = world.with("position");

  for (const entity of entities) {
    if (entity.id === bushId) {
      if (systemCallbacks.onBushDestroyed) {
        systemCallbacks.onBushDestroyed(entity);
      }
      world.remove(entity);
      break;
    }
  }
}

/**
 * Cow Bush Growth System
 *
 * Handles bush growth animation and visual updates.
 */
export function CowBushGrowthSystem(deltaTime: number): void {
  const entities = world.with("position", "scale");

  for (const entity of entities) {
    const bush = (entity as CowEntity).cowBush;
    if (!bush) continue;

    // Grow the bush
    if (!bush.isFullyGrown) {
      const growthRate = 0.003; // Growth per ms
      bush.growthStage = Math.min(1, bush.growthStage + growthRate * deltaTime);

      // Update scale with elastic overshoot for juicy feel
      const targetScale = bush.size;
      const t = bush.growthStage;
      const elasticT = elasticEaseOut(t);

      entity.scale!.x = targetScale.x * elasticT;
      entity.scale!.y = targetScale.y * elasticT;
      entity.scale!.z = targetScale.z * elasticT;

      if (bush.growthStage >= 1) {
        bush.isFullyGrown = true;
      }
    }

    // Handle duration countdown
    if (bush.duration > 0) {
      bush.duration -= deltaTime;

      // Start shrinking when nearly expired
      if (bush.duration < 2000 && bush.isFullyGrown) {
        const shrinkProgress = bush.duration / 2000;
        entity.scale!.scaleInPlace(0.995);
      }

      if (bush.duration <= 0) {
        if (systemCallbacks.onBushDestroyed) {
          systemCallbacks.onBushDestroyed(entity);
        }
        world.remove(entity);
      }
    }
  }
}

/**
 * Elastic ease-out for juicy growth animation
 */
function elasticEaseOut(t: number): number {
  const p = 0.3;
  return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
}

/**
 * Cow Bush Bounce System
 *
 * Handles bouncing falling animals off cow bushes.
 */
export function CowBushBounceSystem(deltaTime: number): void {
  const entities = world.with("position", "scale");

  // Collect all bushes
  const bushes: CowEntity[] = [];
  for (const entity of entities) {
    if ((entity as CowEntity).cowBush?.isFullyGrown) {
      bushes.push(entity as CowEntity);
    }
  }

  if (bushes.length === 0) return;

  // Check falling animals against bushes
  const fallingAnimals = world.with("position", "velocity", "tag");

  for (const animal of fallingAnimals) {
    // Only bounce falling animals (not players)
    if (animal.tag?.type !== "animal") continue;

    // Skip animals moving upward (already bouncing)
    if (animal.velocity!.y < 0) continue;

    const animalPos = animal.position!;

    for (const bushEntity of bushes) {
      const bush = bushEntity.cowBush!;
      const bushPos = bushEntity.position!;
      const bushScale = bushEntity.scale!;

      // Calculate collision bounds
      const bushRadius = bushScale.x * 0.5;
      const bushHeight = bushScale.y;

      const dx = animalPos.x - bushPos.x;
      const dy = animalPos.y - bushPos.y;
      const dz = animalPos.z - bushPos.z;

      const horizontalDist = Math.sqrt(dx * dx + dz * dz);
      const verticalDist = dy;

      // Check if animal is above bush and within horizontal range
      if (
        horizontalDist < bushRadius + 0.3 && // Animal radius ~0.3
        verticalDist >= 0 &&
        verticalDist < bushHeight + 0.5
      ) {
        // Bounce!
        const vel = animal.velocity!;
        const bounceForce = bush.bounceForce;

        // Calculate bounce direction (away from bush center)
        const bounceDir = new Vector3(dx, 0, dz).normalize();

        // Apply bounce velocity
        vel.y = -Math.abs(vel.y) * bounceForce;
        if (vel.y > -3) {
          vel.y = -3 * bounceForce; // Minimum bounce
        }

        // Add horizontal scatter
        vel.x += bounceDir.x * 2;
        vel.z += bounceDir.z * 2;

        // Apply trample damage to bush
        const destroyed = trampleBush(bush);

        // Fire callback
        if (systemCallbacks.onBushBounce) {
          systemCallbacks.onBushBounce(animal, bushEntity, bounceForce);
        }

        if (destroyed) {
          if (systemCallbacks.onBushDestroyed) {
            systemCallbacks.onBushDestroyed(bushEntity);
          }
          world.remove(bushEntity);
        }

        break; // Only bounce off one bush at a time
      }
    }
  }
}

/**
 * Handle brown cow poke - launches poop projectile
 */
export function handleBrownCowPoke(entity: CowEntity): PokeResult {
  const config = COW_VARIANTS.brown;
  const { canTrigger, wobbleForce } = handleBasePoke(entity, config);

  if (!canTrigger || !config.ability) {
    return { poked: true, wobbleForce };
  }

  const variant = entity.animalVariant!;
  const pos = entity.position!;

  // Generate unique seed for this poop/bush
  const seed = `poop_${entity.id}_${Date.now()}_${variant.abilityUseCount}`;

  // Get random direction (mostly horizontal)
  const direction = getRandomDirection(true, seed);
  direction.y = 0.5; // Arc upward

  // Create projectile entity
  const projectileEntity: CowEntity = {
    id: `poop_${seed}`,
    position: new Vector3(pos.x, pos.y + 0.5, pos.z), // Spawn slightly above cow
    velocity: direction.scale(BROWN_COW_POOP_ABILITY.projectile!.speed),
    scale: new Vector3(0.3, 0.3, 0.3),
    tag: { type: "powerup" }, // Using powerup tag for collision filtering
    cowPoop: createCowPoopProjectileComponent(entity.id!, direction, seed),
  };

  world.add(projectileEntity);

  // Update cow state
  variant.variantState.lastPoopTime = Date.now();

  // Fire callback
  if (systemCallbacks.onPoopLaunched) {
    systemCallbacks.onPoopLaunched(entity, projectileEntity, direction);
  }

  return {
    poked: true,
    ability: "cow_poop",
    wobbleForce,
    data: {
      projectileId: projectileEntity.id,
      direction,
      seed,
    },
  };
}

/**
 * Handle poke for any cow variant
 */
export function handleCowPoke(entity: Entity): PokeResult {
  if (!isCowEntity(entity)) {
    return { poked: false };
  }

  const cowEntity = entity as CowEntity;
  const variant = cowEntity.animalVariant;

  if (!variant) {
    return { poked: true, wobbleForce: GAME_CONFIG.poke.wobbleAmount };
  }

  // Route to specific handler based on variant
  switch (variant.variantId) {
    case "brown_cow":
      return handleBrownCowPoke(cowEntity);
    default:
      // Base cow and other variants just wobble
      return {
        poked: true,
        wobbleForce: GAME_CONFIG.poke.wobbleAmount,
      };
  }
}

/**
 * Run all cow-specific systems
 */
export function runCowSystems(deltaTime: number): void {
  CowPoopProjectileSystem(deltaTime);
  CowBushGrowthSystem(deltaTime);
  CowBushBounceSystem(deltaTime);
}

/**
 * Get all active bushes from cow abilities
 */
export function getActiveCowBushes(): CowEntity[] {
  const bushes: CowEntity[] = [];
  const entities = world.with("position");

  for (const entity of entities) {
    if ((entity as CowEntity).cowBush) {
      bushes.push(entity as CowEntity);
    }
  }

  return bushes;
}

/**
 * Get all active poop projectiles
 */
export function getActivePoopProjectiles(): CowEntity[] {
  const projectiles: CowEntity[] = [];
  const entities = world.with("position", "velocity");

  for (const entity of entities) {
    if ((entity as CowEntity).cowPoop) {
      projectiles.push(entity as CowEntity);
    }
  }

  return projectiles;
}

/**
 * Clear all cow-spawned entities (bushes and projectiles)
 */
export function clearCowSpawnedEntities(): void {
  const toRemove: Entity[] = [];
  const entities = world.with("position");

  for (const entity of entities) {
    const cowEntity = entity as CowEntity;
    if (cowEntity.cowBush || cowEntity.cowPoop) {
      toRemove.push(entity);
    }
  }

  for (const entity of toRemove) {
    world.remove(entity);
  }
}

export default {
  setCowSystemCallbacks,
  CowPoopProjectileSystem,
  CowBushGrowthSystem,
  CowBushBounceSystem,
  handleCowPoke,
  runCowSystems,
  getActiveCowBushes,
  getActivePoopProjectiles,
  clearCowSpawnedEntities,
};
