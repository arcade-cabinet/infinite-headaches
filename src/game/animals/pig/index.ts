/**
 * Pig Variants Module
 * Complete pig variant system for Homestead Headaches
 *
 * Pig Variants:
 * 1. Mud Pig - Creates sticky zones that hold falling animals briefly
 * 2. Truffle Pig - Reveals upcoming power-up spawns
 * 3. Flying Pig - Rare variant that floats and stabilizes the stack
 */

// Configuration exports
export {
  type PigVariantId,
  type PigAbilityType,
  type PigVariantConfig,
  type PigVariantVisuals,
  type PigAbilityConfig,
  MUD_PIG_CONFIG,
  TRUFFLE_PIG_CONFIG,
  FLYING_PIG_CONFIG,
  PIG_VARIANTS,
  getPigVariant,
  getSpawnablePigVariants,
  pickRandomPigVariant,
} from "./config";

// Component exports
export {
  type PigEntity,
  type PigVariantComponent,
  type PigAbilityComponent,
  type MudStickyZoneComponent,
  type MudStuckComponent,
  type TruffleRadarComponent,
  type RevealedPowerUpComponent,
  type FloatStabilizeComponent,
  type WobbleReductionBuffComponent,
  type PigAbilityVisualComponent,
  type PigParticleConfig,
  type PigParticleEmitterComponent,
  createPigVariantComponent,
  createPigAbilityComponent,
  createMudStickyZoneComponent,
  createTruffleRadarComponent,
  createFloatStabilizeComponent,
} from "./components";

// System exports
export {
  type PigSystemContext,
  PigAbilityCooldownSystem,
  MudStickyZoneSystem,
  TruffleRadarSystem,
  FloatStabilizeSystem,
  PigAbilityVisualSystem,
  PigParticleSystem,
  activatePigAbility,
  getTotalWobbleReduction,
  isInMudZone,
  runPigSystems,
} from "./systems";

// Variant-specific exports
export {
  createMudPig,
  generateMudSplatterParticles,
  activateMudSplatter,
  checkMudZoneCollision,
  applyMudStickEffect,
  releaseMudStuckEntity,
  renderMudZone,
  getMudPigVisualModifiers,
} from "./variants/mud";

export {
  type UpcomingPowerUpSpawn,
  createTrufflePig,
  generateTruffleSparkles,
  activateTruffleRadar,
  updateRadarPulse,
  renderTruffleRadar,
  renderRevealedPowerUp,
  getTrufflePigVisualModifiers,
  calculateRevealClarity,
} from "./variants/truffle";

export {
  createFlyingPig,
  generateFloatSparkles,
  generateWingFlapTrail,
  activateFloatStabilize,
  updateFloatAnimation,
  calculateWobbleMultiplier,
  renderFloatEffect,
  renderWobbleReductionIndicator,
  getFlyingPigVisualModifiers,
  isFlyingPigLegendary,
  getFlyingPigSpawnMessage,
} from "./variants/flying";

// Re-export for convenience
import { World } from "miniplex";
import type { Entity } from "../../ecs/components";
import type { PigEntity, PigVariantComponent, PigAbilityComponent } from "./components";
import type { PigVariantId } from "./config";
import {
  MUD_PIG_CONFIG,
  TRUFFLE_PIG_CONFIG,
  FLYING_PIG_CONFIG,
} from "./config";
import {
  createPigVariantComponent,
  createPigAbilityComponent,
} from "./components";

/**
 * Create a pig variant entity with all required components
 */
export function createPigVariant(
  world: World<Entity & PigEntity>,
  variantId: PigVariantId,
  x: number,
  y: number
): Entity & PigEntity {
  const config = getConfigForVariant(variantId);

  const entity = world.add({
    id: crypto.randomUUID(),
    position: { x, y, z: 0 } as any,
    velocity: { x: 0, y: 0, z: 0 } as any,
    scale: { x: 1, y: 1, z: 1 } as any,
    tag: { type: "animal", subtype: "pig" as any },
    pigVariant: createPigVariantComponent(variantId),
    pigAbility: createPigAbilityComponent(config.ability.id, config.ability.cooldownMs),
  });

  return entity;
}

/**
 * Get configuration for a specific variant
 */
function getConfigForVariant(variantId: PigVariantId) {
  switch (variantId) {
    case "mud_pig":
      return MUD_PIG_CONFIG;
    case "truffle_pig":
      return TRUFFLE_PIG_CONFIG;
    case "flying_pig":
      return FLYING_PIG_CONFIG;
  }
}

/**
 * Check if an entity is a pig variant
 */
export function isPigVariant(entity: Entity & Partial<PigEntity>): entity is Entity & PigEntity {
  return !!entity.pigVariant;
}

/**
 * Get the variant ID from an entity
 */
export function getPigVariantId(entity: Entity & Partial<PigEntity>): PigVariantId | null {
  return entity.pigVariant?.variantId ?? null;
}

/**
 * Check if a pig variant's ability is ready to use
 */
export function isPigAbilityReady(entity: Entity & PigEntity): boolean {
  const ability = entity.pigAbility;
  if (!ability) return false;
  return ability.cooldownRemaining <= 0 && !ability.isActive;
}

/**
 * Get ability cooldown progress (0-1, where 1 is ready)
 */
export function getPigAbilityCooldownProgress(entity: Entity & PigEntity): number {
  const ability = entity.pigAbility;
  if (!ability) return 0;

  const config = getConfigForVariant(entity.pigVariant!.variantId);
  if (ability.cooldownRemaining <= 0) return 1;

  return 1 - ability.cooldownRemaining / config.ability.cooldownMs;
}

/**
 * Get display info for pig variant
 */
export function getPigVariantDisplayInfo(variantId: PigVariantId): {
  name: string;
  description: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  abilityName: string;
  abilityDescription: string;
  cooldown: number;
} {
  const config = getConfigForVariant(variantId);

  let rarity: "common" | "uncommon" | "rare" | "legendary";
  if (config.spawnWeight >= 0.04) {
    rarity = "uncommon";
  } else if (config.spawnWeight >= 0.02) {
    rarity = "rare";
  } else {
    rarity = "legendary";
  }

  return {
    name: config.name,
    description: getVariantDescription(variantId),
    rarity,
    abilityName: config.ability.name,
    abilityDescription: config.ability.description,
    cooldown: config.ability.cooldownMs,
  };
}

/**
 * Get flavor description for variant
 */
function getVariantDescription(variantId: PigVariantId): string {
  switch (variantId) {
    case "mud_pig":
      return "A pig that loves to wallow in mud. When poked, splatters mud everywhere creating sticky zones.";
    case "truffle_pig":
      return "A keen-nosed pig trained to find treasures. Reveals incoming power-ups before they spawn.";
    case "flying_pig":
      return "The legendary Pigasus! When pigs fly, they bring stability to even the wobbliest stacks.";
  }
}

/**
 * Get all pig variant visual colors for rendering
 */
export function getAllPigVariantColors(): Record<
  PigVariantId,
  { primary: string; secondary: string; glow: string }
> {
  return {
    mud_pig: {
      primary: "#664219",
      secondary: "#8C5A2C",
      glow: MUD_PIG_CONFIG.visuals.glowColor,
    },
    truffle_pig: {
      primary: "#1A1A1A",
      secondary: "#F2F2F2",
      glow: TRUFFLE_PIG_CONFIG.visuals.glowColor,
    },
    flying_pig: {
      primary: "#FFBFCC",
      secondary: "#FFFFFF",
      glow: FLYING_PIG_CONFIG.visuals.glowColor,
    },
  };
}
