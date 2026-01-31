/**
 * Cow Animal Module
 *
 * Complete submodule for cow animals and variants.
 * Implements the AnimalModule interface for cow entities.
 */

import { Vector3, Color3 } from "@babylonjs/core";
import { world } from "../../ecs/world";
import type { Entity } from "../../ecs/components";
import type { QualityLevel } from "../../registry/AnimalRegistry";
import { getAnimal, ANIMAL_REGISTRY } from "../../registry/AnimalRegistry";
import type {
  AnimalModule,
  AnimalEntity,
  AnimalVariantConfig,
  PokeResult,
} from "../types";
import {
  createAnimalVariantComponent,
  applyVisualModifiers,
} from "../base/AnimalBase";
import {
  COW_BASE_ID,
  COW_DISPLAY_NAME,
  getCowVariantsMap,
  COW_VARIANTS,
  POOP_BUSH_CONFIG,
} from "./config";
import {
  createCowVariantComponent,
  isCowEntity,
  type CowEntity,
} from "./components";
import {
  handleCowPoke,
  runCowSystems,
  setCowSystemCallbacks,
  type CowSystemCallbacks,
} from "./systems";

// Export types
export type { CowEntity, CowSystemCallbacks };

// Export components
export {
  createCowVariantComponent,
  createCowPoopProjectileComponent,
  createCowBushComponent,
  isCowEntity,
  isBrownCow,
  isCowBush,
  isCowPoop,
  getBushLeafColor,
  trampleBush,
} from "./components";

// Export systems
export {
  handleCowPoke,
  runCowSystems,
  setCowSystemCallbacks,
  CowPoopProjectileSystem,
  CowBushGrowthSystem,
  CowBushBounceSystem,
  getActiveCowBushes,
  getActivePoopProjectiles,
  clearCowSpawnedEntities,
} from "./systems";

// Export config
export {
  COW_BASE_ID,
  COW_DISPLAY_NAME,
  COW_VARIANTS,
  COW_BASE_MODIFIERS,
  BROWN_COW_CONFIG,
  HEAVY_COW_CONFIG,
  GOLDEN_COW_CONFIG,
  BROWN_COW_POOP_ABILITY,
  POOP_BUSH_CONFIG,
} from "./config";

// Export variants
export * from "./variants";

/**
 * Variant registry for cow module
 */
const cowVariants = getCowVariantsMap();

/**
 * Register cow variants with the main animal registry
 * This is called during game initialization
 */
export function registerCowAnimals(): void {
  // The base cow should already be in the registry from AnimalRegistry.ts
  // We're adding the variant-specific data here

  console.log("[CowModule] Registering cow variants...");

  // Register each variant (if not already registered)
  for (const [variantId, config] of cowVariants) {
    // Skip base cow, it's already registered
    if (variantId === COW_BASE_ID) continue;

    // Check if already registered in main registry
    if (!ANIMAL_REGISTRY.has(variantId)) {
      console.log(`[CowModule] Registering variant: ${variantId}`);

      // Get base cow definition
      const baseCow = getAnimal(COW_BASE_ID);

      // Create variant definition extending base
      const variantDef = {
        ...baseCow,
        id: variantId,
        name: config.name,
        category: config.tags.includes("legendary") ? "special" : "special",
        spawnWeight: config.spawnWeight,
        ability: config.ability
          ? {
              id: config.ability.id,
              name: config.ability.name,
              description: config.ability.description,
              cooldownMs: config.ability.cooldownMs,
              effectType: config.ability.effectType as
                | "projectile"
                | "aoe"
                | "buff"
                | "debuff"
                | "transform",
              effectColors: config.ability.projectile?.colors ||
                config.ability.aoe?.colors || {
                  primary: "#795548",
                  secondary: "#5D4037",
                },
            }
          : null,
        modifiers: {
          weightMultiplier: config.modifiers.weightMultiplier,
          scoreMultiplier: config.modifiers.scoreMultiplier,
          fallSpeedMultiplier: config.modifiers.fallSpeedMultiplier,
          stabilityMultiplier: config.modifiers.stabilityMultiplier,
        },
        isVariant: true,
        baseAnimalId: COW_BASE_ID,
        variantType: config.variantType as
          | "fire"
          | "ice"
          | "golden"
          | "heavy"
          | "swift"
          | undefined,
      } as const;

      // Note: To actually register in the main registry, you'd need to update
      // AnimalRegistry.ts to accept dynamic registrations, or pre-define all
      // variants there. For now, we track them in the cow module.
    }
  }

  console.log(`[CowModule] Registered ${cowVariants.size} cow variants`);
}

/**
 * Get a cow variant configuration
 */
export function getCowVariant(variantId: string): AnimalVariantConfig | undefined {
  return cowVariants.get(variantId);
}

/**
 * Create a cow entity for the ECS world
 */
export function createCowEntity(
  variantId: string,
  position: Vector3,
  quality: QualityLevel
): CowEntity {
  const config = cowVariants.get(variantId);
  if (!config) {
    throw new Error(`Unknown cow variant: ${variantId}`);
  }

  // Get base animal definition for model info
  const baseAnimal = getAnimal(COW_BASE_ID);
  const modelDef = baseAnimal.models[quality];

  // Create base entity
  const entity: CowEntity = {
    id: `cow_${variantId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    position: position.clone(),
    velocity: new Vector3(0, 0, 0),
    scale: new Vector3(modelDef.scale, modelDef.scale, modelDef.scale),
    model: modelDef.glbPath ? `assets/models/${modelDef.glbPath}` : undefined,
    tag: { type: "animal", subtype: "cow" as any },
    physics: {
      mass: config.modifiers.weightMultiplier,
      restitution: 0.2 * (config.modifiers.bounceMultiplier || 1),
      friction: 0.5,
    },
    wobble: {
      offset: 0,
      velocity: 0,
      damping: 0.9,
      springiness: 0.1 / config.modifiers.stabilityMultiplier,
    },
    colorOverlay: {
      color: config.visuals.colorTint || new Color3(1, 1, 1),
      intensity: config.visuals.colorTint ? 0.5 : 0,
    },
    animalVariant: createCowVariantComponent(variantId),
  };

  // Apply visual modifiers
  applyVisualModifiers(entity, config);

  return entity;
}

/**
 * Cow module implementation
 */
export const CowModule: AnimalModule = {
  baseAnimalId: COW_BASE_ID,
  variants: cowVariants,

  register: registerCowAnimals,

  getVariant: getCowVariant,

  createEntity: createCowEntity,

  handlePoke: handleCowPoke,

  updateSystems: (deltaTime: number, entities: AnimalEntity[]) => {
    runCowSystems(deltaTime);
  },
};

export default CowModule;
