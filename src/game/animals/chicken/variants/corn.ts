/**
 * Corn Chicken Variant
 *
 * A golden yellow chicken with corn cob patterns.
 * When poked, shoots corn kernels that act like a lasso/magnet,
 * pulling the nearest falling animal toward your stack.
 *
 * Visual: Yellow chicken with corn cob texture patterns on feathers
 * Cooldown: 4 seconds
 */

import { Vector3, Color3 } from "@babylonjs/core";
import { World } from "miniplex";
import { Entity } from "../../../ecs/components";
import { CORN_CHICKEN_CONFIG } from "../config";
import {
  type ChickenEntity,
  createChickenVariantComponent,
  createChickenAbilityComponent,
} from "../components";
import { spawnCornKernels } from "../systems";
import type { AnimalDefinition } from "../../../registry/AnimalRegistry";

// ============================================================================
// CORN CHICKEN ENTITY FACTORY
// ============================================================================

/**
 * Creates a corn chicken entity with all required components
 */
export function createCornChicken(
  position: Vector3,
  world: World<Entity & ChickenEntity>
): Entity & ChickenEntity {
  const config = CORN_CHICKEN_CONFIG;

  const entity: Entity & ChickenEntity = {
    id: crypto.randomUUID(),
    position: position.clone(),
    velocity: new Vector3(0, 0, 0),
    scale: new Vector3(1, 1, 1),
    model: "assets/models/chicken.glb", // Uses base chicken model with color overlay
    colorOverlay: {
      color: config.visual.baseColor,
      intensity: 0.4, // Tint toward golden yellow
    },
    tag: { type: "animal", subtype: "chicken" },
    physics: { mass: 0.8, restitution: 0.2, friction: 0.5 },
    wobble: { offset: 0, velocity: 0, damping: 0.9, springiness: 0.1 },
    mergeable: { level: 1, mergeRadius: 1.5 },

    // Chicken variant components
    chickenVariant: createChickenVariantComponent("corn", config.id),
    chickenAbility: createChickenAbilityComponent(config.ability.cooldownMs),
  };

  return entity;
}

/**
 * Activates the corn chicken's ability
 * Shoots corn kernels toward the nearest falling animal
 */
export function activateCornChickenAbility(
  world: World<Entity & ChickenEntity>,
  cornChicken: Entity & ChickenEntity,
  nearestFallingAnimalPos: Vector3 | null
): boolean {
  if (!cornChicken.chickenAbility?.isReady) {
    return false;
  }

  spawnCornKernels(world, cornChicken, nearestFallingAnimalPos);
  return true;
}

/**
 * Find the nearest falling animal position for targeting
 */
export function findNearestFallingAnimal(
  world: World<Entity & ChickenEntity>,
  fromPosition: Vector3
): Vector3 | null {
  const fallingAnimals = world.with("tag", "position").where(
    (e) => e.tag?.type === "animal"
  );

  let nearestPos: Vector3 | null = null;
  let nearestDist = Infinity;

  for (const animal of fallingAnimals) {
    if (!animal.position) continue;
    const dist = Vector3.Distance(fromPosition, animal.position);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestPos = animal.position.clone();
    }
  }

  return nearestPos;
}

// ============================================================================
// CORN CHICKEN REGISTRY DEFINITION
// ============================================================================

/**
 * Full registry definition for corn chicken
 * For use with AnimalRegistry
 */
export const CORN_CHICKEN_DEFINITION: AnimalDefinition = {
  id: "corn_chicken",
  name: "Corn Chicken",
  category: "special",

  models: {
    high: { glbPath: "chicken.glb", scale: 1.0 },
    medium: { glbPath: "chicken.glb", scale: 0.9 },
    low: {
      glbPath: null,
      scale: 0.7,
      procedural: {
        shape: "capsule",
        dimensions: [0.3, 0.5],
        color: CORN_CHICKEN_CONFIG.visual.baseColor,
        accents: [
          { color: CORN_CHICKEN_CONFIG.visual.accentColor, position: "front" },
        ],
      },
    },
  },

  sprite: {
    spritePath: "corn_chicken_portrait.png",
    emoji: "🌽🐔",
    procedural: {
      backgroundColor: "#FFD700",
      foregroundColor: "#FFF59D",
      shape: "circle",
    },
  },

  animations: {
    idle: "idle",
    falling: "flap",
    stacked: "perch",
    ability: "peck", // Pecking animation when shooting corn
  },

  spawnWeight: CORN_CHICKEN_CONFIG.spawnWeight,

  ability: {
    id: CORN_CHICKEN_CONFIG.ability.id,
    name: CORN_CHICKEN_CONFIG.ability.name,
    description: CORN_CHICKEN_CONFIG.ability.description,
    cooldownMs: CORN_CHICKEN_CONFIG.ability.cooldownMs,
    effectType: CORN_CHICKEN_CONFIG.ability.effectType,
    effectColors: CORN_CHICKEN_CONFIG.ability.effectColors,
  },

  modifiers: CORN_CHICKEN_CONFIG.modifiers,

  isVariant: true,
  baseAnimalId: "chicken",
  variantType: "golden" as const,
};

// ============================================================================
// VISUAL EFFECT HELPERS
// ============================================================================

/**
 * Creates particle effect data for corn kernel burst
 */
export function createCornBurstParticleData(origin: Vector3): {
  position: Vector3;
  color: string;
  count: number;
  spread: number;
  lifetime: number;
} {
  return {
    position: origin.clone(),
    color: CORN_CHICKEN_CONFIG.ability.effectColors.primary,
    count: 12,
    spread: Math.PI / 3,
    lifetime: 800,
  };
}

/**
 * Creates visual trail data for corn kernel projectile
 */
export function createCornKernelTrailData(): {
  color: string;
  length: number;
  width: number;
  fadeSpeed: number;
} {
  return {
    color: CORN_CHICKEN_CONFIG.ability.effectColors.secondary,
    length: 5,
    width: 0.08,
    fadeSpeed: 0.1,
  };
}

/**
 * Creates magnet line visual data (connecting kernel to target)
 */
export function createMagnetLineData(
  kernelPos: Vector3,
  targetPos: Vector3
): {
  start: Vector3;
  end: Vector3;
  color: string;
  pulseSpeed: number;
} {
  return {
    start: kernelPos.clone(),
    end: targetPos.clone(),
    color: CORN_CHICKEN_CONFIG.ability.effectColors.glow,
    pulseSpeed: 8,
  };
}

// ============================================================================
// GAMEPLAY HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate the effectiveness of corn magnet based on distance
 * Returns a value between 0 and 1
 */
export function calculateMagnetEffectiveness(
  kernelPos: Vector3,
  targetPos: Vector3
): number {
  const dist = Vector3.Distance(kernelPos, targetPos);
  const maxRange = CORN_CHICKEN_CONFIG.ability.magnetRange;

  if (dist >= maxRange) return 0;

  // Inverse square falloff for natural feel
  const normalized = dist / maxRange;
  return Math.pow(1 - normalized, 2);
}

/**
 * Get cooldown progress (0 = on cooldown, 1 = ready)
 */
export function getCornChickenCooldownProgress(
  cornChicken: Entity & ChickenEntity
): number {
  if (!cornChicken.chickenAbility) return 0;

  const { cooldownRemaining, cooldownDuration } = cornChicken.chickenAbility;
  if (cooldownDuration === 0) return 1;

  return 1 - cooldownRemaining / cooldownDuration;
}
