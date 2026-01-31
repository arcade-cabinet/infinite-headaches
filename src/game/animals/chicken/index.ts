/**
 * Chicken Variants Module
 *
 * This module provides creative chicken variants for the "Homestead Headaches" game.
 * Each variant has unique abilities activated when the chicken is poked.
 *
 * ## Variants
 *
 * ### Corn Chicken (Yellow)
 * - When poked, shoots corn kernels toward the nearest falling animal
 * - Corn acts like a magnet/lasso, pulling the falling animal toward your stack
 * - Cooldown: 4 seconds
 *
 * ### Egg Chicken (White with spots)
 * - When poked, lays an egg that rolls off the stack
 * - Egg hatches after 3 seconds into a baby chick
 * - Baby chick auto-catches one falling animal then disappears
 * - Cooldown: 8 seconds
 *
 * ### Rooster (Red)
 * - When poked, crows loudly causing all falling animals to slow down
 * - Slow effect lasts 2 seconds
 * - Visual: Sound waves emanate from rooster
 * - Cooldown: 10 seconds
 *
 * ## Usage
 *
 * ```typescript
 * import { world } from "../ecs/world";
 * import {
 *   createCornChicken,
 *   createEggChicken,
 *   createRooster,
 *   ChickenVariantSystem,
 *   triggerChickenAbility,
 * } from "./animals/chicken";
 *
 * // Create a corn chicken
 * const cornChicken = createCornChicken(position, world);
 * world.add(cornChicken);
 *
 * // In game loop, update chicken systems
 * ChickenVariantSystem(world, deltaTimeMs, stackTopPosition);
 *
 * // When player pokes a chicken
 * if (isChickenVariant(animal)) {
 *   triggerChickenAbility(world, animal, { nearestFallingAnimalPos, stackTopPosition });
 * }
 * ```
 */

// ============================================================================
// CONFIGURATION EXPORTS
// ============================================================================

export {
  // Types
  type ChickenVariant,
  type ChickenAbilityEffect,

  // Configs
  CORN_CHICKEN_CONFIG,
  EGG_CHICKEN_CONFIG,
  ROOSTER_CONFIG,
  CHICKEN_VARIANTS,

  // Utility functions
  getChickenVariantConfig,
  isChickenVariant,
  getVariantFromId,
} from "./config";

// ============================================================================
// COMPONENT EXPORTS
// ============================================================================

export {
  // Core components
  type ChickenVariantComponent,
  type ChickenAbilityComponent,

  // Corn chicken components
  type CornKernelComponent,
  type CornMagnetTargetComponent,

  // Egg chicken components
  type EggComponent,
  type BabyChickComponent,

  // Rooster components
  type RoosterCrowComponent,
  type SoundWaveComponent,
  type CrowSlowedComponent,

  // Effect components
  type ChickenAbilityEffectComponent,
  type ChickenParticleEmitterComponent,

  // Entity type
  type ChickenEntity,

  // Factory functions
  createChickenVariantComponent,
  createChickenAbilityComponent,
  createCornKernelComponent,
  createEggComponent,
  createBabyChickComponent,
  createSoundWaveComponent,
  createCrowSlowedComponent,
} from "./components";

// ============================================================================
// SYSTEM EXPORTS
// ============================================================================

export {
  // Master system (run this in game loop)
  ChickenVariantSystem,

  // Individual systems (for fine-grained control)
  ChickenAbilityCooldownSystem,
  CornKernelSystem,
  CornMagnetTargetSystem,
  EggSystem,
  BabyChickSystem,
  SoundWaveSystem,
  CrowSlowedSystem,
  RoosterCrowAnimationSystem,

  // Ability triggers
  triggerChickenAbility,
  spawnCornKernels,
  spawnEgg,
  activateRoosterCrow,
} from "./systems";

// ============================================================================
// VARIANT EXPORTS
// ============================================================================

// Corn Chicken
export {
  createCornChicken,
  activateCornChickenAbility,
  findNearestFallingAnimal,
  CORN_CHICKEN_DEFINITION,
  createCornBurstParticleData,
  createCornKernelTrailData,
  createMagnetLineData,
  calculateMagnetEffectiveness,
  getCornChickenCooldownProgress,
} from "./variants/corn";

// Egg Chicken
export {
  createEggChicken,
  activateEggChickenAbility,
  getEggState,
  getEggHatchProgress,
  getBabyChickState,
  getBabyChickLifetimeProgress,
  isChickNearTarget,
  EGG_CHICKEN_DEFINITION,
  createEggLayParticleData,
  createEggHatchParticleData,
  createChickTrailData,
  createChickCatchCelebrationData,
  calculateEggRollDirection,
  calculateEggBounce,
  getEggChickenCooldownProgress,
  countActiveEggsAndChicks,
} from "./variants/egg";

// Rooster
export {
  createRooster,
  activateRoosterAbility,
  isRoosterCrowing,
  getRoosterCrowProgress,
  getActiveSoundWaveCount,
  countSlowedEntities,
  getSlowTimeRemaining,
  isSlowedByRooster,
  ROOSTER_DEFINITION,
  createCrowStartParticleData,
  createSoundWaveRingData,
  createSlowIndicatorData,
  createTimeWarpEffectData,
  calculateSoundWavePoints,
  calculateSoundWaveOpacity,
  getRoosterCooldownProgress,
  countAnimalsInSlowRange,
  getEffectiveSlowFactor,
  getCrowAbilityDisplayText,
} from "./variants/rooster";

// ============================================================================
// UNIFIED FACTORY FUNCTION
// ============================================================================

import { Vector3 } from "@babylonjs/core";
import { World } from "miniplex";
import { Entity } from "../../ecs/components";
import type { ChickenEntity } from "./components";
import type { ChickenVariant } from "./config";
import { createCornChicken } from "./variants/corn";
import { createEggChicken } from "./variants/egg";
import { createRooster } from "./variants/rooster";

/**
 * Creates a chicken variant entity based on the variant type.
 * This is the main factory function for creating chicken variants.
 *
 * @param variant - The type of chicken variant to create
 * @param position - The starting position for the chicken
 * @param world - The ECS world to potentially add sub-entities to
 * @returns The created chicken entity
 *
 * @example
 * ```typescript
 * const chicken = createChickenVariant("corn", new Vector3(0, 5, 0), world);
 * world.add(chicken);
 * ```
 */
export function createChickenVariant(
  variant: ChickenVariant,
  position: Vector3,
  world: World<Entity & ChickenEntity>
): Entity & ChickenEntity {
  switch (variant) {
    case "corn":
      return createCornChicken(position, world);
    case "egg":
      return createEggChicken(position, world);
    case "rooster":
      return createRooster(position, world);
    default:
      throw new Error(`Unknown chicken variant: ${variant}`);
  }
}

// ============================================================================
// ALL DEFINITIONS (for registry integration)
// ============================================================================

import { CORN_CHICKEN_DEFINITION } from "./variants/corn";
import { EGG_CHICKEN_DEFINITION } from "./variants/egg";
import { ROOSTER_DEFINITION } from "./variants/rooster";

/**
 * All chicken variant definitions for registry integration
 */
export const ALL_CHICKEN_DEFINITIONS = [
  CORN_CHICKEN_DEFINITION,
  EGG_CHICKEN_DEFINITION,
  ROOSTER_DEFINITION,
] as const;

/**
 * Register all chicken variants with the animal registry
 */
export function registerChickenVariants(
  registerFn: (definition: typeof CORN_CHICKEN_DEFINITION) => void
): void {
  for (const definition of ALL_CHICKEN_DEFINITIONS) {
    registerFn(definition);
  }
}
