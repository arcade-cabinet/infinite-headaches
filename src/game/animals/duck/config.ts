/**
 * Duck Variant Configuration
 * Defines all duck variants and their properties for Homestead Headaches
 */

import { Color3 } from "@babylonjs/core";

/**
 * Duck variant identifiers
 */
export type DuckVariantId = "rubber_duck" | "diving_duck" | "mama_duck";

/**
 * Duck ability types
 */
export type DuckAbilityType = "squeak_bounce" | "dive_stabilize" | "duckling_call";

/**
 * Duck variant visual configuration
 */
export interface DuckVariantVisuals {
  /** Primary body color */
  primaryColor: Color3;
  /** Secondary accent color (beak, feet) */
  secondaryColor: Color3;
  /** Glow effect color for abilities */
  glowColor: string;
  /** Particle effect colors */
  particleColors: string[];
  /** Model tint/overlay intensity */
  tintIntensity: number;
  /** Special visual features description */
  visualFeatures: string[];
}

/**
 * Duck ability configuration
 */
export interface DuckAbilityConfig {
  /** Ability identifier */
  id: DuckAbilityType;
  /** Display name */
  name: string;
  /** Description for UI */
  description: string;
  /** Cooldown in milliseconds */
  cooldownMs: number;
  /** Duration of effect in milliseconds (0 for instant) */
  durationMs: number;
  /** Effect radius in game units */
  effectRadius: number;
  /** Additional parameters specific to ability */
  params: Record<string, number>;
}

/**
 * Complete duck variant definition
 */
export interface DuckVariantConfig {
  /** Unique identifier */
  id: DuckVariantId;
  /** Display name */
  name: string;
  /** Spawn weight (0-1, relative to other variants) */
  spawnWeight: number;
  /** Visual configuration */
  visuals: DuckVariantVisuals;
  /** Ability configuration */
  ability: DuckAbilityConfig;
  /** Gameplay modifiers */
  modifiers: {
    /** Weight multiplier (affects stack wobble) */
    weightMultiplier: number;
    /** Score multiplier when caught */
    scoreMultiplier: number;
    /** Fall speed multiplier */
    fallSpeedMultiplier: number;
    /** Wobble resistance (higher = more stable) */
    stabilityMultiplier: number;
  };
}

/**
 * Rubber Duck Configuration
 * Bright yellow squeaky duck that bounces the stack
 */
export const RUBBER_DUCK_CONFIG: DuckVariantConfig = {
  id: "rubber_duck",
  name: "Rubber Duck",
  spawnWeight: 0.05, // 5% spawn chance
  visuals: {
    primaryColor: new Color3(1.0, 0.92, 0.0), // Bright yellow
    secondaryColor: new Color3(1.0, 0.6, 0.0), // Orange beak
    glowColor: "#FFD700",
    particleColors: ["#FFD700", "#FFA500", "#FFFF00", "#FFE4B5"],
    tintIntensity: 0.3,
    visualFeatures: ["glossy_finish", "squeaky_animation", "bobbing_motion"],
  },
  ability: {
    id: "squeak_bounce",
    name: "Squeak Bounce",
    description: "SQUEAKS and bounces the stack, booping nearby falling animals toward it",
    cooldownMs: 3000,
    durationMs: 500, // Quick bounce effect
    effectRadius: 120, // Boop range
    params: {
      bounceForce: 0.3, // Stack bounce intensity
      boopStrength: 2.5, // Sideways push toward stack
      squeakVolume: 0.8, // Audio feedback
      boopDuration: 300, // How long the boop force applies
    },
  },
  modifiers: {
    weightMultiplier: 0.7, // Light and bouncy
    scoreMultiplier: 1.3,
    fallSpeedMultiplier: 0.9,
    stabilityMultiplier: 0.9,
  },
};

/**
 * Diving Duck Configuration
 * Blue-green duck that dives through the stack to stabilize it
 */
export const DIVING_DUCK_CONFIG: DuckVariantConfig = {
  id: "diving_duck",
  name: "Diving Duck",
  spawnWeight: 0.03, // 3% spawn chance
  visuals: {
    primaryColor: new Color3(0.0, 0.6, 0.5), // Teal/blue-green
    secondaryColor: new Color3(0.0, 0.8, 0.7), // Lighter teal
    glowColor: "#00CED1",
    particleColors: ["#00CED1", "#20B2AA", "#48D1CC", "#40E0D0"],
    tintIntensity: 0.5,
    visualFeatures: ["streamlined_body", "diving_pose", "water_ripple_trail"],
  },
  ability: {
    id: "dive_stabilize",
    name: "Deep Dive",
    description: "Dives down through the stack and stabilizes it from the bottom",
    cooldownMs: 8000,
    durationMs: 1000, // Dive animation duration
    effectRadius: 0, // Affects entire stack
    params: {
      diveSpeed: 5, // Pixels per frame during dive
      wobbleReduction: 0.5, // 50% wobble reduction
      stabilizeDuration: 2000, // How long stability lasts
      phaseThrough: 1, // Can pass through stacked animals
    },
  },
  modifiers: {
    weightMultiplier: 0.9,
    scoreMultiplier: 1.5,
    fallSpeedMultiplier: 1.1, // Falls slightly faster
    stabilityMultiplier: 1.2,
  },
};

/**
 * Mama Duck Configuration
 * Larger duck that attracts ducklings toward the stack
 */
export const MAMA_DUCK_CONFIG: DuckVariantConfig = {
  id: "mama_duck",
  name: "Mama Duck",
  spawnWeight: 0.02, // 2% spawn chance - rarer
  visuals: {
    primaryColor: new Color3(0.9, 0.75, 0.5), // Brown/tan
    secondaryColor: new Color3(1.0, 0.8, 0.0), // Yellow accents
    glowColor: "#DEB887",
    particleColors: ["#DEB887", "#F5DEB3", "#FFE4C4", "#FFDAB9"],
    tintIntensity: 0.4,
    visualFeatures: ["larger_size", "pattern_feathers", "motherly_animation"],
  },
  ability: {
    id: "duckling_call",
    name: "Duckling Call",
    description: "Calls out and attracts small falling animals toward the stack",
    cooldownMs: 15000,
    durationMs: 3000, // Call lasts 3 seconds
    effectRadius: 200, // Attraction range
    params: {
      attractionStrength: 1.5, // Pull force toward stack
      passiveAttractionRange: 100, // Passive effect range
      passiveAttractionStrength: 0.3, // Passive pull (always active)
      ducklingSpeedBonus: 1.2, // Small animals move faster to stack
      maxAffectedAnimals: 5, // Limit on how many animals can be attracted
    },
  },
  modifiers: {
    weightMultiplier: 1.3, // Larger and heavier
    scoreMultiplier: 2.0, // High value
    fallSpeedMultiplier: 0.85, // Falls slower
    stabilityMultiplier: 1.1,
  },
};

/**
 * All duck variants indexed by ID
 */
export const DUCK_VARIANTS: Record<DuckVariantId, DuckVariantConfig> = {
  rubber_duck: RUBBER_DUCK_CONFIG,
  diving_duck: DIVING_DUCK_CONFIG,
  mama_duck: MAMA_DUCK_CONFIG,
};

/**
 * Get duck variant configuration by ID
 */
export function getDuckVariant(id: DuckVariantId): DuckVariantConfig {
  const config = DUCK_VARIANTS[id];
  if (!config) {
    throw new Error(`Unknown duck variant: ${id}`);
  }
  return config;
}

/**
 * Get all spawnable duck variants with their weights
 */
export function getSpawnableDuckVariants(): { id: DuckVariantId; weight: number }[] {
  return Object.entries(DUCK_VARIANTS)
    .filter(([_, config]) => config.spawnWeight > 0)
    .map(([id, config]) => ({ id: id as DuckVariantId, weight: config.spawnWeight }));
}

/**
 * Pick a random duck variant based on spawn weights
 */
export function pickRandomDuckVariant(): DuckVariantId | null {
  const variants = getSpawnableDuckVariants();
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);

  // Check if we should spawn a variant at all
  if (Math.random() > totalWeight) {
    return null; // No variant, spawn regular duck
  }

  const rand = Math.random() * totalWeight;
  let cumulative = 0;

  for (const variant of variants) {
    cumulative += variant.weight;
    if (rand < cumulative) {
      return variant.id;
    }
  }

  return null;
}

/**
 * Check if an animal type is considered a "duckling" for Mama Duck's passive
 */
export function isDucklingType(animalType: string): boolean {
  const ducklingTypes = ["duck", "chicken"]; // Small birds
  return ducklingTypes.includes(animalType.toLowerCase());
}

/**
 * Get the size category of an animal for attraction calculations
 */
export function getAnimalSizeCategory(animalType: string): "small" | "medium" | "large" {
  const smallAnimals = ["duck", "chicken"];
  const largeAnimals = ["cow"];

  if (smallAnimals.includes(animalType.toLowerCase())) return "small";
  if (largeAnimals.includes(animalType.toLowerCase())) return "large";
  return "medium";
}
