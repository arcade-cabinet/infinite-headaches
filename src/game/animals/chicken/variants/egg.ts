/**
 * Egg Chicken Variant
 *
 * A white chicken with brown spots that lays magical eggs.
 * When poked, lays an egg that rolls off the stack.
 * After 3 seconds, the egg hatches into a baby chick that
 * automatically catches one falling animal, then disappears.
 *
 * Visual: White chicken with spotted pattern
 * Cooldown: 8 seconds
 */

import { Vector3, Color3 } from "@babylonjs/core";
import { World } from "miniplex";
import { Entity } from "../../../ecs/components";
import { EGG_CHICKEN_CONFIG } from "../config";
import {
  type ChickenEntity,
  createChickenVariantComponent,
  createChickenAbilityComponent,
} from "../components";
import { spawnEgg } from "../systems";
import type { AnimalDefinition } from "../../../registry/AnimalRegistry";

// ============================================================================
// EGG CHICKEN ENTITY FACTORY
// ============================================================================

/**
 * Creates an egg chicken entity with all required components
 */
export function createEggChicken(
  position: Vector3,
  world: World<Entity & ChickenEntity>
): Entity & ChickenEntity {
  const config = EGG_CHICKEN_CONFIG;

  const entity: Entity & ChickenEntity = {
    id: crypto.randomUUID(),
    position: position.clone(),
    velocity: new Vector3(0, 0, 0),
    scale: new Vector3(1, 1, 1),
    model: "assets/models/chicken.glb",
    colorOverlay: {
      color: config.visual.baseColor,
      intensity: 0.1, // Slight white tint (already white model)
    },
    tag: { type: "animal", subtype: "chicken" },
    physics: { mass: 0.75, restitution: 0.2, friction: 0.5 },
    wobble: { offset: 0, velocity: 0, damping: 0.9, springiness: 0.1 },
    mergeable: { level: 1, mergeRadius: 1.5 },

    // Chicken variant components
    chickenVariant: createChickenVariantComponent("egg", config.id),
    chickenAbility: createChickenAbilityComponent(config.ability.cooldownMs),
  };

  return entity;
}

/**
 * Activates the egg chicken's ability
 * Lays an egg that rolls off and hatches into a helper chick
 */
export function activateEggChickenAbility(
  world: World<Entity & ChickenEntity>,
  eggChicken: Entity & ChickenEntity
): boolean {
  if (!eggChicken.chickenAbility?.isReady) {
    return false;
  }

  spawnEgg(world, eggChicken);
  return true;
}

// ============================================================================
// EGG ENTITY HELPERS
// ============================================================================

/**
 * Get the current state of an egg
 */
export function getEggState(
  eggEntity: Entity & ChickenEntity
): "rolling" | "hatching" | "hatched" | null {
  if (!eggEntity.egg) return null;

  if (eggEntity.egg.hasHatched) return "hatched";
  if (eggEntity.egg.isHatching) return "hatching";
  return "rolling";
}

/**
 * Get egg hatch progress (0 = just laid, 1 = hatching)
 */
export function getEggHatchProgress(
  eggEntity: Entity & ChickenEntity
): number {
  if (!eggEntity.egg) return 0;

  const { hatchTimeRemaining } = eggEntity.egg;
  const totalTime = EGG_CHICKEN_CONFIG.ability.eggHatchTime;

  return 1 - hatchTimeRemaining / totalTime;
}

// ============================================================================
// BABY CHICK ENTITY HELPERS
// ============================================================================

/**
 * Get baby chick's current animation state
 */
export function getBabyChickState(
  chickEntity: Entity & ChickenEntity
): "idle" | "chasing" | "catching" | "celebrating" | null {
  if (!chickEntity.babyChick) return null;
  return chickEntity.babyChick.animationState;
}

/**
 * Get baby chick lifetime remaining (0-1)
 */
export function getBabyChickLifetimeProgress(
  chickEntity: Entity & ChickenEntity
): number {
  if (!chickEntity.babyChick) return 0;

  const { lifetime } = chickEntity.babyChick;
  const totalTime = EGG_CHICKEN_CONFIG.ability.chickLifetime;

  return lifetime / totalTime;
}

/**
 * Check if baby chick is near its target
 */
export function isChickNearTarget(
  chickEntity: Entity & ChickenEntity,
  world: World<Entity & ChickenEntity>
): boolean {
  if (!chickEntity.babyChick?.targetEntityId || !chickEntity.position) {
    return false;
  }

  // Find target entity
  const targets = world.with("position").where(
    (e) => e.id === chickEntity.babyChick!.targetEntityId
  );

  for (const target of targets) {
    if (!target.position) continue;
    const dist = Vector3.Distance(chickEntity.position, target.position);
    return dist < chickEntity.babyChick.catchRadius / 60;
  }

  return false;
}

// ============================================================================
// EGG CHICKEN REGISTRY DEFINITION
// ============================================================================

/**
 * Full registry definition for egg chicken
 * For use with AnimalRegistry
 */
export const EGG_CHICKEN_DEFINITION: AnimalDefinition = {
  id: "egg_chicken",
  name: "Egg Chicken",
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
        color: EGG_CHICKEN_CONFIG.visual.baseColor,
        accents: [
          { color: EGG_CHICKEN_CONFIG.visual.accentColor, position: "front" },
        ],
      },
    },
  },

  sprite: {
    spritePath: "egg_chicken_portrait.png",
    emoji: "🥚🐔",
    procedural: {
      backgroundColor: "#FFFFFF",
      foregroundColor: "#8D6E63",
      shape: "circle",
    },
  },

  animations: {
    idle: "idle",
    falling: "flap",
    stacked: "perch",
    ability: "squat", // Squatting to lay egg
  },

  spawnWeight: EGG_CHICKEN_CONFIG.spawnWeight,

  ability: {
    id: EGG_CHICKEN_CONFIG.ability.id,
    name: EGG_CHICKEN_CONFIG.ability.name,
    description: EGG_CHICKEN_CONFIG.ability.description,
    cooldownMs: EGG_CHICKEN_CONFIG.ability.cooldownMs,
    effectType: EGG_CHICKEN_CONFIG.ability.effectType,
    effectColors: EGG_CHICKEN_CONFIG.ability.effectColors,
  },

  modifiers: EGG_CHICKEN_CONFIG.modifiers,

  isVariant: true,
  baseAnimalId: "chicken",
  variantType: undefined, // Unique variant, no base type
};

// ============================================================================
// VISUAL EFFECT HELPERS
// ============================================================================

/**
 * Creates particle effect data for egg laying
 */
export function createEggLayParticleData(origin: Vector3): {
  position: Vector3;
  color: string;
  count: number;
  spread: number;
  lifetime: number;
} {
  return {
    position: origin.clone(),
    color: EGG_CHICKEN_CONFIG.ability.effectColors.secondary,
    count: 8,
    spread: Math.PI / 4,
    lifetime: 600,
  };
}

/**
 * Creates particle effect data for egg hatching
 */
export function createEggHatchParticleData(origin: Vector3): {
  position: Vector3;
  colors: string[];
  count: number;
  spread: number;
  lifetime: number;
} {
  return {
    position: origin.clone(),
    colors: [
      EGG_CHICKEN_CONFIG.visual.eggColor.toHexString(),
      "#FFFFFF",
      EGG_CHICKEN_CONFIG.visual.chickColor.toHexString(),
    ],
    count: 15,
    spread: Math.PI,
    lifetime: 1000,
  };
}

/**
 * Creates visual data for baby chick trail
 */
export function createChickTrailData(): {
  color: string;
  particleSize: number;
  emissionRate: number;
  lifetime: number;
} {
  return {
    color: EGG_CHICKEN_CONFIG.visual.chickColor.toHexString(),
    particleSize: 0.05,
    emissionRate: 20,
    lifetime: 400,
  };
}

/**
 * Creates celebration particle effect when chick catches an animal
 */
export function createChickCatchCelebrationData(origin: Vector3): {
  position: Vector3;
  colors: string[];
  count: number;
  upwardBias: number;
  lifetime: number;
} {
  return {
    position: origin.clone(),
    colors: ["#FFEB3B", "#FFF59D", "#FFD54F"],
    count: 20,
    upwardBias: 0.8,
    lifetime: 800,
  };
}

// ============================================================================
// EGG PHYSICS HELPERS
// ============================================================================

/**
 * Calculate egg roll direction based on stack tilt
 */
export function calculateEggRollDirection(
  stackWobbleOffset: number
): 1 | -1 {
  // If stack is tilting right, egg rolls right; left, rolls left
  // With some randomness when stack is near center
  if (Math.abs(stackWobbleOffset) < 0.1) {
    return Math.random() > 0.5 ? 1 : -1;
  }
  return stackWobbleOffset > 0 ? 1 : -1;
}

/**
 * Calculate egg bounce when hitting ground/platform
 */
export function calculateEggBounce(
  currentVelocityY: number,
  bounceFactor: number = 0.4
): number {
  return -currentVelocityY * bounceFactor;
}

// ============================================================================
// GAMEPLAY HELPER FUNCTIONS
// ============================================================================

/**
 * Get cooldown progress (0 = on cooldown, 1 = ready)
 */
export function getEggChickenCooldownProgress(
  eggChicken: Entity & ChickenEntity
): number {
  if (!eggChicken.chickenAbility) return 0;

  const { cooldownRemaining, cooldownDuration } = eggChicken.chickenAbility;
  if (cooldownDuration === 0) return 1;

  return 1 - cooldownRemaining / cooldownDuration;
}

/**
 * Count active eggs and chicks from this chicken
 */
export function countActiveEggsAndChicks(
  world: World<Entity & ChickenEntity>,
  chickenId: string
): { eggs: number; chicks: number } {
  let eggs = 0;
  let chicks = 0;

  const eggEntities = world.with("egg");
  for (const egg of eggEntities) {
    if (egg.egg!.parentChickenId === chickenId) {
      eggs++;
    }
  }

  const chickEntities = world.with("babyChick");
  for (const chick of chickEntities) {
    // Chicks don't track parent chicken, but we could add that
    chicks++;
  }

  return { eggs, chicks };
}
