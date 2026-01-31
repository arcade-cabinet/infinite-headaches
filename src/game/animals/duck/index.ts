/**
 * Duck Animal Module
 *
 * Complete submodule for duck animals and variants.
 * Provides Rubber Duck, Diving Duck, and Mama Duck variants.
 *
 * Variants:
 * - Rubber Duck: Squeak bounce that pushes falling animals toward stack
 * - Diving Duck: Dives through stack to stabilize wobble
 * - Mama Duck: Attracts small falling animals toward the stack
 */

import { Vector3 } from "@babylonjs/core";
import { World } from "miniplex";
import type { Entity } from "../../ecs/components";
import type { AnimalModule, AnimalEntity, PokeResult, AnimalVariantConfig } from "../types";
import type { QualityLevel } from "../../registry/AnimalRegistry";
import { GAME_CONFIG } from "../../config";

// Import configs
import {
  DUCK_VARIANTS,
  getDuckVariant,
  getSpawnableDuckVariants,
  pickRandomDuckVariant,
  isDucklingType,
  getAnimalSizeCategory,
  type DuckVariantId,
  type DuckVariantConfig,
} from "./config";

// Import components
import {
  createDuckVariantComponent,
  createDuckAbilityComponent,
  createSqueakBounceComponent,
  createDiveStabilizeComponent,
  createDucklingAttractionComponent,
  type DuckEntity,
  type DuckVariantComponent,
  type DuckAbilityComponent,
} from "./components";

// Import systems
import {
  DuckVariantSystem,
  DuckAbilityCooldownSystem,
  SqueakBounceSystem,
  DiveStabilizeSystem,
  DucklingAttractionSystem,
  triggerDuckAbility,
  isDuckAbilityReady,
  getDuckAbilityCooldownProgress,
  updateDuckSystemContext,
  getGlobalWobbleReduction,
  resetGlobalWobbleReduction,
  getAttractedEntityIds,
  getActiveSqueakEffects,
  getActiveDiveEffects,
} from "./systems";

// ============================================================================
// CONFIG EXPORTS
// ============================================================================

export {
  DUCK_VARIANTS,
  getDuckVariant,
  getSpawnableDuckVariants,
  pickRandomDuckVariant,
  isDucklingType,
  getAnimalSizeCategory,
  type DuckVariantId,
  type DuckVariantConfig,
};

// ============================================================================
// COMPONENT EXPORTS
// ============================================================================

export {
  createDuckVariantComponent,
  createDuckAbilityComponent,
  createSqueakBounceComponent,
  createDiveStabilizeComponent,
  createDucklingAttractionComponent,
  type DuckEntity,
  type DuckVariantComponent,
  type DuckAbilityComponent,
};

// ============================================================================
// SYSTEM EXPORTS
// ============================================================================

export {
  DuckVariantSystem,
  DuckAbilityCooldownSystem,
  SqueakBounceSystem,
  DiveStabilizeSystem,
  DucklingAttractionSystem,
  triggerDuckAbility,
  isDuckAbilityReady,
  getDuckAbilityCooldownProgress,
  updateDuckSystemContext,
  getGlobalWobbleReduction,
  resetGlobalWobbleReduction,
  getAttractedEntityIds,
  getActiveSqueakEffects,
  getActiveDiveEffects,
};

// ============================================================================
// MODULE IMPLEMENTATION
// ============================================================================

/**
 * Convert internal duck variant config to AnimalVariantConfig interface
 */
function toAnimalVariantConfig(config: DuckVariantConfig): AnimalVariantConfig {
  return {
    id: config.id,
    name: config.name,
    baseAnimalId: "duck",
    variantType: config.id.replace("_duck", ""),
    spawnWeight: config.spawnWeight,
    minLevel: 2, // Default minimum level
    visuals: {
      colorTint: config.visuals.primaryColor,
      emissionColor: undefined,
      emissionIntensity: config.visuals.tintIntensity,
      scaleModifier: new Vector3(1, 1, 1),
      particleEffect: config.visuals.visualFeatures[0],
      materialOverride: undefined,
    },
    modifiers: {
      weightMultiplier: config.modifiers.weightMultiplier,
      scoreMultiplier: config.modifiers.scoreMultiplier,
      fallSpeedMultiplier: config.modifiers.fallSpeedMultiplier,
      stabilityMultiplier: config.modifiers.stabilityMultiplier,
    },
    ability: {
      id: config.ability.id,
      name: config.ability.name,
      description: config.ability.description,
      trigger: "poke",
      cooldownMs: config.ability.cooldownMs,
      effectType: "aoe",
      aoe: {
        radius: config.ability.effectRadius,
        duration: config.ability.durationMs,
        persistent: false,
        strength: 1.0,
        effectId: config.ability.id,
        colors: {
          primary: config.visuals.glowColor,
          secondary: config.visuals.particleColors[0],
        },
      },
    },
    behaviorOverride: undefined,
    tags: ["special", "duck", "variant"],
  };
}

/**
 * Build variant map for module interface
 */
const duckVariantsMap = new Map<string, AnimalVariantConfig>(
  Object.values(DUCK_VARIANTS).map((config) => [config.id, toAnimalVariantConfig(config)])
);

/**
 * Register duck variants
 */
function registerDuckVariants(): void {
  console.log(
    "[DuckModule] Registered duck variants:",
    Object.keys(DUCK_VARIANTS).join(", ")
  );
}

/**
 * Get variant configuration
 */
function getVariant(variantId: string): AnimalVariantConfig | undefined {
  return duckVariantsMap.get(variantId);
}

/**
 * Create a duck variant entity
 */
function createDuckVariant(
  world: World<Entity & DuckEntity>,
  variantId: DuckVariantId,
  position: Vector3
): Entity & DuckEntity {
  const config = getDuckVariant(variantId);

  const entity = world.add({
    id: `duck_${variantId}_${Date.now()}`,
    position: { x: position.x, y: position.y, z: position.z } as any,
    velocity: { x: 0, y: 0, z: 0 } as any,
    scale: { x: 1, y: 1, z: 1 } as any,
    tag: { type: "animal", subtype: "duck" as any },
    duckVariant: createDuckVariantComponent(variantId),
    duckAbility: createDuckAbilityComponent(config.ability.id, config.ability.cooldownMs),
  });

  return entity;
}

/**
 * Create a duck entity for the module interface
 */
function createEntity(
  variantId: string,
  position: Vector3,
  _quality: QualityLevel
): AnimalEntity {
  const config = getDuckVariant(variantId as DuckVariantId);
  if (!config) {
    throw new Error(`Unknown duck variant: ${variantId}`);
  }

  // Create entity without world (caller will add to world)
  const entity: AnimalEntity = {
    id: `duck_${variantId}_${Date.now()}`,
    position: position.clone(),
    velocity: new Vector3(0, 0, 0),
    scale: new Vector3(1, 1, 1),
    tag: { type: "animal", subtype: "duck" as any },
    animalVariant: {
      variantId,
      baseType: "duck",
      abilityCooldown: 0,
      abilityReady: true,
      abilityUseCount: 0,
      variantState: {},
    },
  };

  return entity;
}

/**
 * Handle poke interaction
 */
function handlePoke(
  entity: AnimalEntity,
  context?: { stackCenterX?: number; stackTopY?: number; stackBottomY?: number }
): PokeResult {
  const duckEntity = entity as Entity & DuckEntity;

  if (!duckEntity.duckVariant || !duckEntity.duckAbility) {
    return { poked: true, wobbleForce: GAME_CONFIG.poke.wobbleAmount };
  }

  const ctx = {
    stackCenterX: context?.stackCenterX ?? 0,
    stackTopY: context?.stackTopY ?? 0,
    stackBottomY: context?.stackBottomY ?? 0,
  };

  const success = triggerDuckAbility(duckEntity, ctx);

  return {
    poked: true,
    ability: success ? duckEntity.duckVariant.variantId : undefined,
    wobbleForce: GAME_CONFIG.poke.wobbleAmount,
    data: success ? { variantId: duckEntity.duckVariant.variantId } : undefined,
  };
}

/**
 * Update duck-specific systems
 */
function updateSystems(
  deltaTime: number,
  entities: AnimalEntity[],
  context?: {
    stackCenterX?: number;
    stackTopY?: number;
    fallingAnimals?: any[];
  }
): void {
  // Update context
  if (context) {
    updateDuckSystemContext({
      stackCenterX: context.stackCenterX ?? 0,
      stackTopY: context.stackTopY ?? 0,
      fallingAnimals: context.fallingAnimals ?? [],
    });
  }

  // Reset per-frame values
  resetGlobalWobbleReduction();

  // Run systems
  DuckVariantSystem(deltaTime);
}

// ============================================================================
// MODULE EXPORT
// ============================================================================

/**
 * Duck module implementing AnimalModule interface
 */
export const DuckModule: AnimalModule = {
  baseAnimalId: "duck",
  variants: duckVariantsMap,
  register: registerDuckVariants,
  getVariant,
  createEntity,
  handlePoke,
  updateSystems,
};

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Check if an entity is a duck variant
 */
export function isDuckVariant(entity: Entity & Partial<DuckEntity>): entity is Entity & DuckEntity {
  return !!entity.duckVariant;
}

/**
 * Get display info for a duck variant
 */
export function getDuckVariantDisplayInfo(variantId: DuckVariantId): {
  name: string;
  description: string;
  abilityName: string;
  abilityDescription: string;
  cooldown: number;
} {
  const config = getDuckVariant(variantId);
  return {
    name: config.name,
    description: `A special duck variant with unique abilities.`,
    abilityName: config.ability.name,
    abilityDescription: config.ability.description,
    cooldown: config.ability.cooldownMs,
  };
}

/**
 * Get all duck variant colors for rendering
 */
export function getAllDuckVariantColors(): Record<
  DuckVariantId,
  { primary: string; secondary: string; glow: string }
> {
  return {
    rubber_duck: {
      primary: "#FFD700",
      secondary: "#FFA500",
      glow: DUCK_VARIANTS.rubber_duck.visuals.glowColor,
    },
    diving_duck: {
      primary: "#00CED1",
      secondary: "#20B2AA",
      glow: DUCK_VARIANTS.diving_duck.visuals.glowColor,
    },
    mama_duck: {
      primary: "#DEB887",
      secondary: "#F5DEB3",
      glow: DUCK_VARIANTS.mama_duck.visuals.glowColor,
    },
  };
}

export default DuckModule;
