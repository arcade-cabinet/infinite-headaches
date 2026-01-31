/**
 * Cow Animal Configuration
 *
 * Defines the cow animal and all its variants.
 * Cows are heavy, stable animals that are harder to topple.
 */

import { Vector3, Color3 } from "@babylonjs/core";
import type {
  AnimalVariantConfig,
  AnimalAbilityConfig,
  VisualModifier,
  VariantGameplayModifiers,
} from "../types";

/**
 * Base cow configuration
 */
export const COW_BASE_ID = "cow";
export const COW_DISPLAY_NAME = "Cow";

/**
 * Default gameplay modifiers for base cow
 */
export const COW_BASE_MODIFIERS: VariantGameplayModifiers = {
  weightMultiplier: 1.2,
  scoreMultiplier: 1.0,
  fallSpeedMultiplier: 1.0,
  stabilityMultiplier: 1.1,
  bounceMultiplier: 0.8, // Cows don't bounce as much
  knockbackResistance: 1.2, // Harder to knock off
};

/**
 * Brown Cow Poop Ability Configuration
 *
 * When poked, the Brown Cow launches a "cow poop" projectile
 * in a random direction. Where it lands, a bush grows
 * procedurally using seedrandom for determinism.
 */
export const BROWN_COW_POOP_ABILITY: AnimalAbilityConfig = {
  id: "cow_poop",
  name: "Fertilize",
  description:
    "Launches a projectile that grows a bouncy bush where it lands. " +
    "Falling animals that hit the bush bounce back up for another catch chance!",
  trigger: "poke",
  cooldownMs: 8000, // 8 second cooldown
  effectType: "projectile",
  projectile: {
    speed: 8,
    size: 0.3,
    duration: 3000,
    count: 1,
    spread: 0,
    affectedByGravity: true,
    strength: 1.0,
    effectId: "poop_trail",
    colors: {
      primary: "#5D4037", // Dark brown
      secondary: "#8D6E63", // Medium brown
      glow: "#4E342E", // Darker brown glow
    },
  },
  soundEffect: "splat",
  animation: "poop",
};

/**
 * Bush spawn configuration from poop impact
 */
export const POOP_BUSH_CONFIG = {
  /** Base size of the bush */
  baseSize: new Vector3(1.5, 1.2, 1.5),
  /** Random size variation range */
  sizeVariation: 0.3,
  /** Bounce force multiplier */
  bounceForce: 1.8,
  /** Duration (0 = permanent until destroyed) */
  duration: 30000, // 30 seconds
  /** Colors for procedural bush generation */
  colors: {
    leaves: [
      new Color3(0.2, 0.6, 0.2), // Green
      new Color3(0.3, 0.5, 0.2), // Olive green
      new Color3(0.15, 0.5, 0.15), // Dark green
    ],
    highlights: [
      new Color3(0.4, 0.7, 0.3), // Light green
      new Color3(0.35, 0.65, 0.25), // Yellow-green
    ],
  },
  /** Procedural generation parameters */
  procedural: {
    branchCount: { min: 4, max: 8 },
    leafDensity: { min: 0.6, max: 1.0 },
    maxHeight: 1.5,
    spreadFactor: 1.2,
  },
};

/**
 * Brown Cow Visual Modifiers
 */
export const BROWN_COW_VISUALS: VisualModifier = {
  colorTint: new Color3(0.55, 0.35, 0.2), // Warm brown tint
  emissionColor: undefined, // No glow
  emissionIntensity: 0,
  scaleModifier: new Vector3(1.0, 1.0, 1.0), // Same size
  particleEffect: undefined, // No particle effect
  materialOverride: undefined, // Use tinted base material
};

/**
 * Brown Cow Gameplay Modifiers
 * Slightly different from base cow
 */
export const BROWN_COW_MODIFIERS: VariantGameplayModifiers = {
  weightMultiplier: 1.3, // Slightly heavier
  scoreMultiplier: 1.2, // Worth more points
  fallSpeedMultiplier: 1.05, // Falls slightly faster
  stabilityMultiplier: 1.15, // More stable
  bounceMultiplier: 0.7, // Bounces even less
  knockbackResistance: 1.3,
};

/**
 * Brown Cow Variant Configuration
 */
export const BROWN_COW_CONFIG: AnimalVariantConfig = {
  id: "brown_cow",
  name: "Brown Cow",
  baseAnimalId: COW_BASE_ID,
  variantType: "brown",
  spawnWeight: 0.05, // Rare spawn
  minLevel: 3, // Requires level 3+
  visuals: BROWN_COW_VISUALS,
  modifiers: BROWN_COW_MODIFIERS,
  ability: BROWN_COW_POOP_ABILITY,
  behaviorOverride: undefined, // Use default falling behavior
  tags: ["special", "ability", "spawn_bush", "rare"],
};

/**
 * Heavy Cow Visual Modifiers
 */
export const HEAVY_COW_VISUALS: VisualModifier = {
  colorTint: new Color3(0.35, 0.25, 0.2), // Darker brown
  emissionColor: undefined,
  emissionIntensity: 0,
  scaleModifier: new Vector3(1.3, 1.3, 1.3), // Bigger!
  particleEffect: undefined,
  materialOverride: undefined,
};

/**
 * Heavy Cow Gameplay Modifiers
 */
export const HEAVY_COW_MODIFIERS: VariantGameplayModifiers = {
  weightMultiplier: 2.0, // Very heavy!
  scoreMultiplier: 2.0, // Worth double points
  fallSpeedMultiplier: 1.3, // Falls faster
  stabilityMultiplier: 0.7, // Makes stack less stable
  bounceMultiplier: 0.5, // Barely bounces
  knockbackResistance: 2.0, // Very hard to knock off
};

/**
 * Heavy Cow Variant Configuration
 */
export const HEAVY_COW_CONFIG: AnimalVariantConfig = {
  id: "heavy_cow",
  name: "Heavy Cow",
  baseAnimalId: COW_BASE_ID,
  variantType: "heavy",
  spawnWeight: 0.02, // Very rare
  minLevel: 5, // Requires level 5+
  visuals: HEAVY_COW_VISUALS,
  modifiers: HEAVY_COW_MODIFIERS,
  ability: null, // No special ability
  behaviorOverride: "dive", // Falls straight down fast
  tags: ["special", "heavy", "challenging", "rare"],
};

/**
 * Golden Cow Visual Modifiers
 */
export const GOLDEN_COW_VISUALS: VisualModifier = {
  colorTint: new Color3(1.0, 0.84, 0.0), // Gold
  emissionColor: new Color3(1.0, 0.9, 0.4), // Golden glow
  emissionIntensity: 0.3,
  scaleModifier: new Vector3(1.1, 1.1, 1.1), // Slightly bigger
  particleEffect: "sparkle_gold",
  materialOverride: "metallic_gold",
};

/**
 * Golden Cow Gameplay Modifiers
 */
export const GOLDEN_COW_MODIFIERS: VariantGameplayModifiers = {
  weightMultiplier: 1.0,
  scoreMultiplier: 5.0, // 5x points!
  fallSpeedMultiplier: 1.2, // Falls faster
  stabilityMultiplier: 1.0,
  bounceMultiplier: 1.0,
  knockbackResistance: 1.0,
};

/**
 * Golden Cow Variant Configuration
 */
export const GOLDEN_COW_CONFIG: AnimalVariantConfig = {
  id: "golden_cow",
  name: "Golden Cow",
  baseAnimalId: COW_BASE_ID,
  variantType: "golden",
  spawnWeight: 0.01, // Extremely rare
  minLevel: 8, // Requires level 8+
  visuals: GOLDEN_COW_VISUALS,
  modifiers: GOLDEN_COW_MODIFIERS,
  ability: null, // No special ability, just valuable
  behaviorOverride: "zigzag", // Moves erratically
  tags: ["special", "golden", "valuable", "legendary"],
};

/**
 * Milk Cow Visual Modifiers
 */
export const MILK_COW_VISUALS: VisualModifier = {
  colorTint: new Color3(1.0, 1.0, 1.0), // White with black spots (base)
  emissionColor: new Color3(0.9, 0.95, 1.0),
  emissionIntensity: 0.1,
  scaleModifier: new Vector3(1.0, 1.0, 1.0),
  particleEffect: "milk_drops",
  materialOverride: "holstein_pattern",
};

/**
 * Milk Cow Gameplay Modifiers
 */
export const MILK_COW_MODIFIERS: VariantGameplayModifiers = {
  weightMultiplier: 1.1, // Slightly heavier (full of milk)
  scoreMultiplier: 1.15,
  fallSpeedMultiplier: 0.95, // Falls slightly slower
  stabilityMultiplier: 1.1,
  bounceMultiplier: 0.9,
  knockbackResistance: 1.1,
};

/**
 * Milk Cow Variant Configuration
 */
export const MILK_COW_CONFIG: AnimalVariantConfig = {
  id: "milk_cow",
  name: "Milk Cow",
  baseAnimalId: COW_BASE_ID,
  variantType: "milk",
  spawnWeight: 0.035,
  minLevel: 4,
  visuals: MILK_COW_VISUALS,
  modifiers: MILK_COW_MODIFIERS,
  ability: null, // Defined in variants/MilkCow.ts
  behaviorOverride: undefined,
  tags: ["special", "ability", "zone", "speed"],
};

/**
 * Highland Cow Visual Modifiers
 */
export const HIGHLAND_COW_VISUALS: VisualModifier = {
  colorTint: new Color3(0.6, 0.35, 0.2), // Reddish-brown
  emissionColor: undefined,
  emissionIntensity: 0,
  scaleModifier: new Vector3(1.1, 0.95, 1.15), // Wider, slightly shorter
  particleEffect: "hair_strands",
  materialOverride: "shaggy_coat",
};

/**
 * Highland Cow Gameplay Modifiers
 */
export const HIGHLAND_COW_MODIFIERS: VariantGameplayModifiers = {
  weightMultiplier: 1.3, // Heavy
  scoreMultiplier: 1.25,
  fallSpeedMultiplier: 0.9, // Falls slower
  stabilityMultiplier: 1.4, // Very stable!
  bounceMultiplier: 0.7, // Doesn't bounce much
  knockbackResistance: 1.4,
};

/**
 * Highland Cow Variant Configuration
 */
export const HIGHLAND_COW_CONFIG: AnimalVariantConfig = {
  id: "highland_cow",
  name: "Highland Cow",
  baseAnimalId: COW_BASE_ID,
  variantType: "highland",
  spawnWeight: 0.03,
  minLevel: 5,
  visuals: HIGHLAND_COW_VISUALS,
  modifiers: HIGHLAND_COW_MODIFIERS,
  ability: null, // Defined in variants/HighlandCow.ts
  behaviorOverride: undefined,
  tags: ["special", "ability", "wind", "stable"],
};

/**
 * All cow variants
 */
export const COW_VARIANTS = {
  base: {
    id: COW_BASE_ID,
    name: COW_DISPLAY_NAME,
    baseAnimalId: COW_BASE_ID,
    variantType: "base",
    spawnWeight: 0.2,
    minLevel: 0,
    visuals: {
      colorTint: undefined,
      emissionColor: undefined,
      emissionIntensity: 0,
      scaleModifier: new Vector3(1, 1, 1),
      particleEffect: undefined,
      materialOverride: undefined,
    } as VisualModifier,
    modifiers: COW_BASE_MODIFIERS,
    ability: null,
    behaviorOverride: undefined,
    tags: ["farm", "common"],
  } as AnimalVariantConfig,
  brown: BROWN_COW_CONFIG,
  milk: MILK_COW_CONFIG,
  highland: HIGHLAND_COW_CONFIG,
  heavy: HEAVY_COW_CONFIG,
  golden: GOLDEN_COW_CONFIG,
};

/**
 * Get all variant configs as a Map
 */
export function getCowVariantsMap(): Map<string, AnimalVariantConfig> {
  const map = new Map<string, AnimalVariantConfig>();
  for (const [key, config] of Object.entries(COW_VARIANTS)) {
    map.set(config.id, config);
  }
  return map;
}

/**
 * Export default config
 */
export default {
  baseId: COW_BASE_ID,
  displayName: COW_DISPLAY_NAME,
  variants: COW_VARIANTS,
  bushConfig: POOP_BUSH_CONFIG,
};
