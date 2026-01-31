/**
 * Sheep Animal Module
 *
 * Exports all sheep variants and provides the module interface
 * for integration with the animal registry and game systems.
 *
 * Variants:
 * - Electric Sheep: Chain stun ability
 * - Rainbow Sheep: Score multiplier with trail effect
 * - Counting Sheep: Global slow ability
 */

import { Vector3 } from "@babylonjs/core";
import type { AnimalModule, AnimalEntity, PokeResult, AnimalVariantConfig } from "../types";
import type { QualityLevel } from "../../registry/AnimalRegistry";

// Import configs
import {
  SHEEP_VARIANTS,
  SHEEP_VARIANT_MAP,
  ELECTRIC_SHEEP_CONFIG,
  RAINBOW_SHEEP_CONFIG,
  COUNTING_SHEEP_CONFIG,
} from "./config";

// Import variant implementations
import {
  ElectricSheepVariant,
  createElectricSheep,
  handleElectricSheepPoke,
  updateElectricSheep,
} from "./variants/electric";

import {
  RainbowSheepVariant,
  createRainbowSheep,
  handleRainbowSheepPoke,
  updateRainbowSheep,
} from "./variants/rainbow";

import {
  CountingSheepVariant,
  createCountingSheep,
  handleCountingSheepPoke,
  updateCountingSheep,
} from "./variants/counting";

// Import systems
import {
  SheepVariantSystem,
  clearSheepEffects,
  isAnimalStunned,
  hasRainbowTrail,
  getRainbowScoreBonus,
  isSleepWaveActive,
  getSleepSpeedMultiplier,
  getStunEffects,
  getRainbowTrailEffects,
  getSleepWaveEffect,
} from "./systems";

// ============================================================================
// MODULE IMPLEMENTATION
// ============================================================================

const sheepVariants = new Map<string, AnimalVariantConfig>(
  SHEEP_VARIANTS.map((v) => [v.id, v])
);

/**
 * Register all sheep variants with the animal registry
 */
function registerSheepVariants(): void {
  // Note: Base sheep is already registered in AnimalRegistry.ts
  // We only register the new variants here

  // The AnimalRegistry uses a different format, so we need to adapt
  // For now, we store our detailed configs separately and will integrate
  // with the registry pattern used by the game
  console.log("[SheepModule] Registered sheep variants:", SHEEP_VARIANTS.map(v => v.id).join(", "));
}

/**
 * Get variant configuration by ID
 */
function getVariant(variantId: string): AnimalVariantConfig | undefined {
  return sheepVariants.get(variantId);
}

/**
 * Create a sheep entity based on variant ID
 */
function createEntity(
  variantId: string,
  position: Vector3,
  _quality: QualityLevel
): AnimalEntity {
  switch (variantId) {
    case "electric_sheep":
      return createElectricSheep(position);
    case "rainbow_sheep":
      return createRainbowSheep(position);
    case "counting_sheep":
      return createCountingSheep(position);
    default:
      throw new Error(`Unknown sheep variant: ${variantId}`);
  }
}

/**
 * Handle poke interaction for any sheep variant
 */
function handlePoke(
  entity: AnimalEntity,
  fallingAnimals?: { id: string; position: Vector3; velocity: Vector3 }[]
): PokeResult {
  const variantId = entity.animalVariant?.variantId;

  switch (variantId) {
    case "electric_sheep":
      return handleElectricSheepPoke(entity, fallingAnimals || []);
    case "rainbow_sheep":
      return handleRainbowSheepPoke(entity, fallingAnimals || []);
    case "counting_sheep":
      return handleCountingSheepPoke(entity);
    default:
      return { poked: false };
  }
}

/**
 * Update sheep-specific systems
 */
function updateSystems(
  deltaTime: number,
  entities: AnimalEntity[],
  fallingAnimals?: { id: string; position: Vector3; velocity: Vector3 }[],
  rng?: () => number
): void {
  // Update individual entity states
  for (const entity of entities) {
    const variantId = entity.animalVariant?.variantId;
    const random = rng || Math.random;

    switch (variantId) {
      case "electric_sheep":
        updateElectricSheep(entity, deltaTime);
        break;
      case "rainbow_sheep":
        updateRainbowSheep(entity, deltaTime);
        break;
      case "counting_sheep":
        updateCountingSheep(entity, deltaTime, random);
        break;
    }
  }

  // Update global effects system
  SheepVariantSystem(
    deltaTime,
    entities as any[],
    fallingAnimals || [],
    rng || Math.random
  );
}

// ============================================================================
// MODULE EXPORT
// ============================================================================

/**
 * Sheep module implementing AnimalModule interface
 */
export const SheepModule: AnimalModule = {
  baseAnimalId: "sheep",
  variants: sheepVariants,
  register: registerSheepVariants,
  getVariant,
  createEntity,
  handlePoke,
  updateSystems,
};

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

// Configs
export {
  SHEEP_VARIANTS,
  SHEEP_VARIANT_MAP,
  ELECTRIC_SHEEP_CONFIG,
  RAINBOW_SHEEP_CONFIG,
  COUNTING_SHEEP_CONFIG,
};

// Variant implementations
export {
  ElectricSheepVariant,
  RainbowSheepVariant,
  CountingSheepVariant,
};

// Entity creators
export {
  createElectricSheep,
  createRainbowSheep,
  createCountingSheep,
};

// Systems and utilities
export {
  SheepVariantSystem,
  clearSheepEffects,
  isAnimalStunned,
  hasRainbowTrail,
  getRainbowScoreBonus,
  isSleepWaveActive,
  getSleepSpeedMultiplier,
  getStunEffects,
  getRainbowTrailEffects,
  getSleepWaveEffect,
};

// Components (for type checking)
export type {
  ElectricSheepState,
  RainbowSheepState,
  CountingSheepState,
  ZParticle,
  StunEffect,
  RainbowTrailEffect,
  SleepWaveEffect,
} from "./components";

export default SheepModule;
