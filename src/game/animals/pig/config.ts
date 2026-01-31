/**
 * Pig Variant Configuration
 * Defines all pig variants and their properties for Homestead Headaches
 */

import { Color3 } from "@babylonjs/core";

/**
 * Pig variant identifiers
 */
export type PigVariantId = "mud_pig" | "truffle_pig" | "flying_pig";

/**
 * Pig ability types
 */
export type PigAbilityType = "mud_splatter" | "truffle_radar" | "float_stabilize";

/**
 * Pig variant visual configuration
 */
export interface PigVariantVisuals {
  /** Primary body color */
  primaryColor: Color3;
  /** Secondary accent color */
  secondaryColor: Color3;
  /** Glow effect color for abilities */
  glowColor: string;
  /** Particle effect colors */
  particleColors: string[];
  /** Model tint/overlay */
  tintIntensity: number;
  /** Special visual features description */
  visualFeatures: string[];
}

/**
 * Pig ability configuration
 */
export interface PigAbilityConfig {
  /** Ability identifier */
  id: PigAbilityType;
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
 * Complete pig variant definition
 */
export interface PigVariantConfig {
  /** Unique identifier */
  id: PigVariantId;
  /** Display name */
  name: string;
  /** Spawn weight (0-1, relative to other variants) */
  spawnWeight: number;
  /** Visual configuration */
  visuals: PigVariantVisuals;
  /** Ability configuration */
  ability: PigAbilityConfig;
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
 * Mud Pig Configuration
 * Brown/muddy pig that splatters mud creating sticky zones
 */
export const MUD_PIG_CONFIG: PigVariantConfig = {
  id: "mud_pig",
  name: "Mud Pig",
  spawnWeight: 0.04, // 4% spawn chance
  visuals: {
    primaryColor: new Color3(0.4, 0.26, 0.13), // Dark brown
    secondaryColor: new Color3(0.55, 0.35, 0.17), // Lighter mud brown
    glowColor: "#8B4513",
    particleColors: ["#8B4513", "#5D3A1A", "#A0522D", "#6B4423"],
    tintIntensity: 0.6,
    visualFeatures: ["mud_splashes", "dripping_effect", "dirty_spots"],
  },
  ability: {
    id: "mud_splatter",
    name: "Mud Splatter",
    description: "Splatters mud creating a sticky zone that briefly holds falling animals",
    cooldownMs: 5000,
    durationMs: 1500, // Sticky effect lasts 1.5 seconds
    effectRadius: 80, // Pixels radius for mud splatter
    params: {
      stickyDuration: 1500, // How long animals stick
      splatterCount: 8, // Number of mud particles
      mudPuddleRadius: 60, // Ground puddle size
    },
  },
  modifiers: {
    weightMultiplier: 1.1,
    scoreMultiplier: 1.2,
    fallSpeedMultiplier: 1.0,
    stabilityMultiplier: 1.0,
  },
};

/**
 * Truffle Pig Configuration
 * Black pig with white spots that reveals hidden power-ups
 */
export const TRUFFLE_PIG_CONFIG: PigVariantConfig = {
  id: "truffle_pig",
  name: "Truffle Pig",
  spawnWeight: 0.03, // 3% spawn chance
  visuals: {
    primaryColor: new Color3(0.1, 0.1, 0.1), // Black
    secondaryColor: new Color3(0.95, 0.95, 0.95), // White spots
    glowColor: "#FFD700",
    particleColors: ["#FFD700", "#FFA500", "#FFFF00", "#F5DEB3"],
    tintIntensity: 0.4,
    visualFeatures: ["white_spots", "sniffing_nose", "golden_glow"],
  },
  ability: {
    id: "truffle_radar",
    name: "Truffle Radar",
    description: "Sniffs out and reveals power-ups spawning in the next 5 seconds",
    cooldownMs: 12000,
    durationMs: 5000, // Radar lasts 5 seconds
    effectRadius: 150, // Radar detection radius (visual)
    params: {
      revealDuration: 5000, // How long the preview lasts
      radarPulseInterval: 500, // Visual pulse frequency
      maxPowerUpsRevealed: 3, // Max power-ups to show
    },
  },
  modifiers: {
    weightMultiplier: 0.9,
    scoreMultiplier: 1.5,
    fallSpeedMultiplier: 0.95,
    stabilityMultiplier: 1.1,
  },
};

/**
 * Flying Pig Configuration
 * Pink pig with tiny wings - rare variant that floats and stabilizes
 */
export const FLYING_PIG_CONFIG: PigVariantConfig = {
  id: "flying_pig",
  name: "Flying Pig",
  spawnWeight: 0.01, // 1% spawn chance - RARE!
  visuals: {
    primaryColor: new Color3(1.0, 0.75, 0.8), // Light pink
    secondaryColor: new Color3(1.0, 1.0, 1.0), // White wings
    glowColor: "#FFB6C1",
    particleColors: ["#FFB6C1", "#FFC0CB", "#FFFFFF", "#FFE4E1"],
    tintIntensity: 0.3,
    visualFeatures: ["tiny_wings", "floating_animation", "sparkle_trail"],
  },
  ability: {
    id: "float_stabilize",
    name: "Pigasus Float",
    description: "Floats upward briefly and reduces stack wobble by 30%",
    cooldownMs: 6000,
    durationMs: 3000, // Stabilization effect lasts 3 seconds
    effectRadius: 0, // Affects entire stack
    params: {
      floatHeight: 30, // Pixels to float up
      wobbleReduction: 0.3, // 30% wobble reduction
      floatDuration: 500, // How long the float animation takes
    },
  },
  modifiers: {
    weightMultiplier: 0.6, // Very light!
    scoreMultiplier: 2.5, // High value due to rarity
    fallSpeedMultiplier: 0.7, // Falls slower
    stabilityMultiplier: 1.3, // Very stable
  },
};

/**
 * All pig variants indexed by ID
 */
export const PIG_VARIANTS: Record<PigVariantId, PigVariantConfig> = {
  mud_pig: MUD_PIG_CONFIG,
  truffle_pig: TRUFFLE_PIG_CONFIG,
  flying_pig: FLYING_PIG_CONFIG,
};

/**
 * Get pig variant configuration by ID
 */
export function getPigVariant(id: PigVariantId): PigVariantConfig {
  const config = PIG_VARIANTS[id];
  if (!config) {
    throw new Error(`Unknown pig variant: ${id}`);
  }
  return config;
}

/**
 * Get all spawnable pig variants with their weights
 */
export function getSpawnablePigVariants(): { id: PigVariantId; weight: number }[] {
  return Object.entries(PIG_VARIANTS)
    .filter(([_, config]) => config.spawnWeight > 0)
    .map(([id, config]) => ({ id: id as PigVariantId, weight: config.spawnWeight }));
}

/**
 * Pick a random pig variant based on spawn weights
 */
export function pickRandomPigVariant(): PigVariantId | null {
  const variants = getSpawnablePigVariants();
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);

  // Check if we should spawn a variant at all (based on total weight)
  if (Math.random() > totalWeight) {
    return null; // No variant, spawn regular pig
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
